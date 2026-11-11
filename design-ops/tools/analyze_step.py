# STEP 어셈블리 분석: 부품 이름, 개수, 부피, 외형, 무게중심을 뽑는다. 사용법: analyze_step.py <입력.step> <출력.json>
import sys, json, time
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool, XCAFDoc_ShapeTool
from OCP.TCollection import TCollection_ExtendedString
from OCP.TDF import TDF_Label
from OCP.collections import Sequence_TDF_Label as TDF_LabelSequence
from OCP.TDataStd import TDataStd_Name
from OCP.IFSelect import IFSelect_RetDone
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.gp import gp_Trsf, gp_Pnt

src, dst = sys.argv[1], sys.argv[2]
t0 = time.time()
def log(*a): print(f"[{time.time()-t0:7.1f}s]", *a, flush=True)

app = XCAFApp_Application.GetApplication_s()
doc = TDocStd_Document(TCollection_ExtendedString("MDTV-XCAF"))
app.InitDocument(doc)
rd = STEPCAFControl_Reader(); rd.SetNameMode(True); rd.SetColorMode(False); rd.SetLayerMode(False); rd.SetPropsMode(False)
log("읽기 시작")
st = rd.ReadFile(src)
if st != IFSelect_RetDone: print("읽기 실패", st); sys.exit(2)
log("파일 읽음, 변환 시작")
if not rd.Transfer(doc): print("변환 실패"); sys.exit(3)
log("변환 완료")
shape_tool = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())

def fix(s):
    try: return s.encode("latin-1").decode("cp949")
    except Exception: return s
def name_of(label):
    n = TDataStd_Name()
    if label.FindAttribute(TDataStd_Name.GetID_s(), n): return fix(n.Get().ToExtString())
    return ""

part_cache = {}   # label tag -> dict
instances = []
sub_counts = {}
glob_box = Bnd_Box()
def tag(label): return label.Tag() if label.Father().IsNull() else ".".join(str(x) for x in path_tags(label))
def path_tags(label):
    out = []; l = label
    while not l.IsNull() and not l.Father().IsNull():
        out.append(l.Tag()); l = l.Father()
    return list(reversed(out))

def part_info(label):
    key = tag(label)
    if key in part_cache: return part_cache[key]
    shp = shape_tool.GetShape_s(label)
    props = GProp_GProps(); BRepGProp.VolumeProperties_s(shp, props)
    vol = props.Mass(); c = props.CentreOfMass()
    box = Bnd_Box(); BRepBndLib.AddOptimal_s(shp, box, False, False)
    if box.IsVoid(): lo = hi = (0, 0, 0)
    else:
        a, b = box.CornerMin(), box.CornerMax(); lo, hi = (a.X(), a.Y(), a.Z()), (b.X(), b.Y(), b.Z())
    info = {"name": name_of(label), "vol": vol, "cg": (c.X(), c.Y(), c.Z()), "lo": lo, "hi": hi}
    part_cache[key] = info; return info

def visit(label, trsf, path, depth):
    if XCAFDoc_ShapeTool.IsAssembly_s(label):
        nm = name_of(label); sub_counts[nm] = sub_counts.get(nm, 0) + 1
        comps = TDF_LabelSequence(); XCAFDoc_ShapeTool.GetComponents_s(label, comps)
        for i in range(1, comps.Length() + 1):
            c = comps.Value(i); ref = TDF_Label()
            if XCAFDoc_ShapeTool.GetReferredShape_s(c, ref):
                loc = XCAFDoc_ShapeTool.GetLocation_s(c)
                t = gp_Trsf(); t.Multiply(trsf); t.Multiply(loc.Transformation())
                visit(ref, t, path + [nm], depth + 1)
    else:
        info = part_info(label)
        p = gp_Pnt(*info["cg"]); p.Transform(trsf)
        # 외형: 8개 모서리를 변환해 전체 외형에 합침
        lo, hi = info["lo"], info["hi"]
        gl = [1e18, 1e18, 1e18]; gh = [-1e18, -1e18, -1e18]
        for xi in (lo[0], hi[0]):
            for yi in (lo[1], hi[1]):
                for zi in (lo[2], hi[2]):
                    q = gp_Pnt(xi, yi, zi); q.Transform(trsf); glob_box.Add(q)
                    for k, v in enumerate((q.X(), q.Y(), q.Z())):
                        gl[k] = min(gl[k], v); gh[k] = max(gh[k], v)
        instances.append({"part": tag(label), "path": path, "cg": (p.X(), p.Y(), p.Z()), "lo": gl, "hi": gh})

free = TDF_LabelSequence(); shape_tool.GetFreeShapes(free)
log("최상위 개수", free.Length())
for i in range(1, free.Length() + 1):
    visit(free.Value(i), gp_Trsf(), [], 0)
    if i % 1 == 0: log("최상위", i, "완료, 부품 종류", len(part_cache), "인스턴스", len(instances))
a, b = glob_box.CornerMin(), glob_box.CornerMax(); x0, y0, z0, x1, y1, z1 = a.X(), a.Y(), a.Z(), b.X(), b.Y(), b.Z()
out = {"bbox": [x0, y0, z0, x1, y1, z1], "parts": part_cache, "instances": instances, "assemblies": sub_counts}
json.dump(out, open(dst, "w"), ensure_ascii=False)
log("저장", dst, "부품 종류", len(part_cache), "인스턴스", len(instances), "외형", [round(x1-x0,1), round(y1-y0,1), round(z1-z0,1)])
