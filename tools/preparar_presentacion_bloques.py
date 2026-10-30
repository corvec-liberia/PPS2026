"""Prepara HTML para revisión; nunca publica ni modifica el archivo fuente."""
from pathlib import Path
import re,argparse
p=argparse.ArgumentParser(description=__doc__);p.add_argument('fuente',type=Path);p.add_argument('salida',type=Path);a=p.parse_args()
assert a.fuente.resolve()!=a.salida.resolve(),'No sobrescribir el original.'
folder=Path(__file__).resolve().parents[1]/'herramientas-bloques';s=a.fuente.read_text(encoding='utf-8-sig')
assert 'PPS_EVAL_TEXTOS_DOCUMENTADOS' not in s
renderers=re.findall(r'<script>\(function\(\)\{window\.ppsEvalDibujar=function\(d\).*?</script>',s,re.S);assert len(renderers)==1
payload='\n'.join('<script>'+ (folder/name).read_text()+'</script>' for name in ['textos-documentados-2025.js','referencias-bloques.js','impresion-bloques.js','renderizador-bloques.js'])
s=s.replace(renderers[0],payload)
adapters=[body for body in re.findall(r'<script[^>]*>(.*?)</script>',s,re.S) if '/* PPS2026: guardado sin rediseño */' in body];assert len(adapters)==1
s=s.replace(adapters[0],(folder/'adapter-bloques.js').read_text())
old=(folder/'observador-global-anterior.js').read_text();assert s.count(old)==1
s=s.replace(old,'/* Numeración por bloque sin sobrescrituras de etiquetas globales. */')
a.salida.parent.mkdir(parents=True,exist_ok=True);a.salida.write_text(s)
print('Candidata de revisión preparada; producción no modificada:',a.salida)
