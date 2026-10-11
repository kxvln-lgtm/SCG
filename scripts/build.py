"""Deterministic build for SCG's shared hosting. No server runtime or secrets."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
import json
import shutil
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
DOCS = [
 ('02','organizational','02_Organizational_Policy.docx','Общая политика','Культура команды, профессиональная этика, ответственность и принципы взаимодействия.'),
 ('03','member','03_Member_Code.docx','Кодекс участника','Права, обязанности и правила участия в проектах и жизни сообщества.'),
 ('04','leadership','04_Leadership_Code.docx','Кодекс руководителя','Полномочия, делегирование, принятие решений и ответственность руководства.'),
 ('05','regional','05_Regional_Policy.docx','Региональная структура','Организация регионов, команд, назначения и региональная отчётность.'),
 ('06','project','06_Project_Policy.docx','Политика проектов','Жизненный цикл проекта, роли участников и действия в нестандартных ситуациях.'),
 ('07','disciplinary','07_Disciplinary_Policy.docx','Дисциплинарная политика','Рассмотрение нарушений, порядок решений и возможность пересмотра.'),
 ('08','brand','08_Communication_Brand_Policy.docx','Коммуникация и бренд','Официальное представительство, публикации, символика и правила коммуникации.'),
]

class LegalSanitizer(HTMLParser):
    allowed = {'h3','p','ul','ol','li','strong','b','em','br','a'}
    def __init__(self):
        super().__init__(); self.parts=[]
    def handle_starttag(self, tag, attrs):
        if tag not in self.allowed: return
        clean=''
        if tag=='a':
            href=dict(attrs).get('href','')
            if href.startswith(('https://','mailto:')): clean=' href="'+escape(href,quote=True)+'" rel="noopener noreferrer"'
        self.parts.append('<'+tag+clean+'>')
    def handle_endtag(self, tag):
        if tag in self.allowed and tag!='br': self.parts.append('</'+tag+'>')
    def handle_data(self, data): self.parts.append(escape(data))

def write_catalog():
    catalog=[]
    for number,slug,file,title,description in DOCS:
        with zipfile.ZipFile(ROOT/file) as z:
            xml=ET.fromstring(z.read('word/document.xml'))
            ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs=[''.join(p.itertext()).strip() for p in xml.findall('.//w:p',ns)]
        catalog.append(dict(number=number,slug=slug,file=file,title=title,description=description,version='original-1',paragraphs=[p for p in paragraphs if p]))
    (ROOT/'assets/documents.json').write_text(json.dumps(catalog,ensure_ascii=False),encoding='utf-8')
    # The public repository builds from sanitized legal copy, not private backups.
    legal_source=json.loads((ROOT/'assets/legal.json').read_text(encoding='utf-8'))
    legal={}
    for key in ['privacy','terms']:
        value=legal_source.get(key)
        if not isinstance(value,str) or not value.strip():
            raise ValueError('Missing legal copy: '+key)
        parser=LegalSanitizer();parser.feed(value)
        legal[key]=''.join(parser.parts)
    (ROOT/'assets/legal.json').write_text(json.dumps(legal,ensure_ascii=False),encoding='utf-8')

def html(surface,title,canonical):
    static_intro = '''<header class="public-nav"><a class="brand" href="/"><span>SCG</span><small>STAGE CRAFT<br>GROUP</small></a><div class="public-account"><a class="btn dark" href="/backstage/">Backstage ↗</a></div></header><main id="main" class="landing-hero"><div class="hero-copy"><span class="eyebrow">STAGE CRAFT GROUP · KAZAKHSTAN</span><h1>Ты — часть<br>большого<br><em>события.</em></h1><p>Люди. Проекты. Культура. Найди свою команду в SCG Backstage.</p><a class="btn primary" href="/backstage/">Открыть Backstage</a></div></main>'''
    return f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5f5f1">
<title>{escape(title)}</title>
<meta name="description" content="Stage Craft Group — люди, проекты и культура в Казахстане. Backstage: проекты, участие, документы и сообщество SCG.">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stage Craft Group">
<meta property="og:title" content="SCG — Люди. Проекты. Культура.">
<meta property="og:description" content="Твоя команда. Твоя история. Твоё место за кулисами.">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="https://stagecraft.kz/og-cover.png">
<meta property="og:locale" content="ru_RU">
<meta name="twitter:card" content="summary_large_image">
{'<meta name="robots" content="noindex,nofollow">' if surface!='public' else ''}
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/style.css?v=2">
<script src="/assets/supabase-2.117.3.js"></script>
<script type="module" src="/assets/app.js?v=2"></script>
</head>
<body data-surface="{surface}">
<a class="skip-link" href="#main">Перейти к содержимому</a>
<div id="app">{static_intro if surface=='public' else '<main id="main" class="recovery-layout"><div class="loading-state" role="status"><span class="spinner"></span>Открываем SCG…</div></main>'}</div>
<dialog id="dialog" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title"></h2><button class="icon-btn" data-close-dialog aria-label="Закрыть">×</button></header><div id="dialog-content" class="dialog-content"></div></dialog>
<div id="toasts" class="toast-stack" aria-live="polite" aria-atomic="false"></div>
<noscript><div class="public-page"><p>Для Backstage нужен JavaScript. Документы доступны для скачивания:</p><ul>{''.join(f'<li><a href="/{file}">{escape(title)}</a></li>' for _,_,file,title,_ in DOCS)}</ul></div></noscript>
</body>
</html>
'''

def build():
    write_catalog()
    entries=[('index.html','public','SCG — Stage Craft Group | Люди. Проекты. Культура.','https://stagecraft.kz/'),('backstage/index.html','backstage','SCG Backstage — личное пространство','https://stagecraft.kz/backstage/'),('admin/index.html','admin','SCG Command Center','https://admin.stagecraft.kz/'),('reset-password.html','recovery','Восстановление доступа — SCG','https://stagecraft.kz/reset-password.html')]
    for path,surface,title,url in entries:
        (ROOT/path).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/path).write_text(html(surface,title,url),encoding='utf-8')
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    for path,_,_,_ in entries:
        target=OUT/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/path,target)
    shutil.copytree(ROOT/'assets',OUT/'assets')
    for _,_,file,_,_ in DOCS: shutil.copy2(ROOT/file,OUT/file)
    for file in ['.htaccess','favicon-16.png','favicon-32.png','apple-touch-icon.png','og-cover.png','site.webmanifest','robots.txt','sitemap.xml']:
        shutil.copy2(ROOT/file,OUT/file)
    archive=ROOT/'scg-production.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for file in OUT.rglob('*'):
            if file.is_file():z.write(file,file.relative_to(OUT))
    print(json.dumps({'directory':str(OUT),'files':len(list(OUT.rglob('*'))),'bytes':sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()),'archive':str(archive)},ensure_ascii=False))

if __name__=='__main__':build()
