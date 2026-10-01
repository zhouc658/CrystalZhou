#!/usr/bin/env python3
"""Generate static project pages: python3 scripts/build_projects.py [--only furumi].
Standard library only. Edit projects/projects.json, not the generated HTML.
"""
import argparse
import html
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
LAYOUTS = {'text-image', 'image-text', 'full', 'pair', 'collage', 'strip', 'text'}

def esc(value):
    return html.escape(str(value), quote=True)

def relative(path, page):
    if urlparse(path).scheme or path.startswith('#'):
        return path
    return Path(os.path.relpath(ROOT / path, (ROOT / page).parent)).as_posix()

def paragraphs(items):
    return '\n'.join(f'<p>{esc(item)}</p>' for item in items)

def placeholder(label, shape='landscape'):
    return f'<!-- TODO: Replace this temporary media block with supplied project artwork. -->\n<div class="media-placeholder shape-{esc(shape)}"><span class="placeholder-mark" aria-hidden="true">＋</span><p>{esc(label)}</p><span class="media-status">Project media to come</span></div>'

def MediaBlock(media, page, hero=False):
    kind = media.get('type', 'image')
    src = esc(relative(media.get('src', ''), page))
    shape = media.get('shape', 'natural')
    title = esc(media.get('alt', media.get('title', 'Project media')))
    if kind == 'placeholder':
        content = placeholder(media['label'], media.get('shape', 'landscape'))
    elif kind == 'image':
        dimensions = f' width="{int(media["width"])}" height="{int(media["height"])}"' if 'width' in media and 'height' in media else ''
        loading = 'fetchpriority="high"' if hero else 'loading="lazy"'
        content = f'<img src="{src}" alt="{title}"{dimensions} {loading} decoding="async">'
    elif kind in ('video', 'loop'):
        poster = f' poster="{esc(relative(media["poster"], page))}"' if media.get('poster') else ''
        # Loop autoplay is enabled progressively only when reduced motion is off.
        behavior = ' muted loop data-decorative-loop' if kind == 'loop' else ''
        tracks = ''.join(f'<track kind="captions" src="{esc(relative(t["src"], page))}" srclang="{esc(t["lang"])}" label="{esc(t["label"])}">' for t in media.get('tracks', []))
        content = f'<video controls playsinline preload="metadata" aria-label="{title}"{poster}{behavior}><source src="{src}" type="{esc(media.get("mime", "video/mp4"))}">{tracks}<a href="{src}">Download video</a></video>'
    elif kind == 'embed':
        ratio = media.get('ratio', [16, 9])
        width, height = (max(1, int(n)) for n in ratio)
        content = f'<iframe src="{src}" title="{title}" loading="lazy" width="{width}" height="{height}" style="aspect-ratio: {width} / {height}" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
    else:
        raise ValueError(f'Unknown media type: {kind}')
    caption = f'<figcaption>{esc(media["caption"])}</figcaption>' if media.get('caption') else ''
    return f'<figure class="media-block media-type-{esc(kind)} shape-{esc(shape)}">{content}{caption}</figure>'

def SiteHeader(page, active='work'):
    """One masthead partial for Home, Work, About, and every project."""
    values = {}
    for name, target in [('home', 'index.html'), ('work', 'work.html')]:
        values[name + '_url'] = esc(relative(target, page))
        values[name + '_current'] = ' aria-current="page"' if active == name else ''
    return (ROOT / 'templates/site-header.html').read_text().strip().format(**values)

def ProjectAnnotation(lines):
    return '<aside class="project-annotation" aria-label="Project note">' + ''.join(f'<span>{esc(line)}</span>' for line in lines) + '</aside>' if lines else ''

def ProjectHeader(project):
    title = '<br>'.join(esc(line) for line in project['title_lines']) if project.get('title_lines') else esc(project['title'])
    year = f'<time class="project-year" datetime="{esc(project["year"])}">{esc(project.get("year_label", project["year"]))}</time>' if project.get('year') else '<!-- TODO: Add the confirmed project year. -->'
    return f'''<header class="project-intro">
<div class="project-intro-copy"><h1>{title}</h1><p class="project-deck">{esc(project['description'])}</p><p class="project-category">{esc(project['category'])}</p></div>
<div class="project-intro-aside">{ProjectAnnotation(project.get('annotation'))}{year}</div>
</header>'''

def ProjectHero(project):
    if not project.get('hero'):
        return ''
    return '<div class="project-hero">' + MediaBlock(project['hero'], project['path'], hero=True) + '</div>'

def ProjectMetadata(project):
    parts = []
    for key, label in [('role', 'My role'), ('tools', 'Tools')]:
        if key not in project.get('metadata_fields', ['role', 'tools']):
            continue
        values = project.get(key, [])
        content = '<ul>' + ''.join(f'<li>{esc(v)}</li>' for v in values) + '</ul>' if values else f'<!-- TODO: Supply confirmed {key}. --><p class="draft-copy">Details to come.</p>'
        parts.append(f'<div><dt>{label}</dt><dd>{content}</dd></div>')
    return '<dl class="project-metadata">' + ''.join(parts) + '</dl>'

def section_heading(title, section_id):
    return f'<header class="section-heading"><h2 id="{section_id}">{esc(title)}</h2></header>'

def ProjectSection(section, number, page):
    layout = section.get('layout', 'full')
    if layout not in LAYOUTS:
        raise ValueError(f'Unknown layout: {layout}')
    sid = f'section-{number:02}'
    copy = paragraphs(section.get('paragraphs', []))
    if section.get('placeholder'):
        copy += f'<!-- TODO: Replace this draft with verified project content. --><p class="draft-copy">{esc(section["placeholder"])}</p>'
    if section.get('code'):
        copy += f'<pre><code>{esc(section["code"])}</code></pre>'
    if section.get('links'):
        copy += '<ul class="project-links">' + ''.join(f'<li><a href="{esc(relative(link["href"], page))}">{esc(link["label"])} <span aria-hidden="true">↗</span></a></li>' for link in section['links']) + '</ul>'
    if section.get('supplement'):
        copy += (ROOT / 'templates' / section['supplement']).read_text()
    media = ''.join(MediaBlock(item, page) for item in section.get('media', []))
    gallery = f'<div class="section-media">{media}</div>' if media else ''
    if section.get('aside'):
        gallery += '<aside class="section-aside">' + (ROOT / 'templates' / section['aside']).read_text() + '</aside>'
    return f'<section class="project-section layout-{layout}" aria-labelledby="{sid}"><div class="section-copy">{section_heading(section["title"], sid)}{copy}</div>{gallery}</section>'

def NextProject(project, next_project):
    preview = next_project.get('thumbnail')
    if preview:
        image = f'<img src="{esc(relative(preview, project["path"]))}" alt="" loading="lazy">'
    else:
        image = '<span class="next-preview-placeholder" aria-hidden="true">'+esc(next_project.get('preview_title', next_project['title']))+'</span>'
    return f'''<nav class="project-pagination" aria-label="More projects">
<a class="next-project" href="{esc(relative(next_project['path'], project['path']))}"><div><p class="next-label">Next project <span aria-hidden="true">→</span></p><h2>{esc(next_project.get('preview_title', next_project['title']))}</h2><p class="project-category">{esc(next_project.get('preview_category', next_project['category']))}</p></div><div class="next-preview">{image}</div></a>
<a class="back-to-work" href="{relative('work.html', project['path'])}">← Back to all work</a></nav>'''

def render(project, catalog):
    path = project['path']
    url = lambda target: esc(relative(target, path))
    stylesheet = f'<link rel="stylesheet" href="{url(project["stylesheet"])}">' if project.get('stylesheet') else ''
    sections = '\n'.join(ProjectSection(section, index, path) for index, section in enumerate(project['sections'], 2))
    return f'''<!DOCTYPE html>
<!-- Generated by scripts/build_projects.py. Edit projects/projects.json and rebuild. -->
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(project['title'])} | Crystal Zhou</title>
<meta name="description" content="{esc(project['description'])}">
<link rel="stylesheet" href="{url('css/global.css')}"><link rel="stylesheet" href="{url('css/project.css')}">{stylesheet}
<script src="{url('js/main.js')}" defer></script><script src="{url('js/project.js')}" defer></script>
</head><body class="page-project project-{esc(project['id'])}">
<a class="skip-link" href="#main">Skip to content</a>
{SiteHeader(path)}
<main id="main" class="project-main container" tabindex="-1">
<a class="back-to-work project-breadcrumb" href="{url('work.html')}">← Back to work</a>
{ProjectHeader(project)}
{ProjectHero(project)}
<section class="project-section project-overview" aria-labelledby="section-01"><div class="section-copy">{section_heading('Overview', 'section-01')}{paragraphs(project['overview'])}</div>{ProjectMetadata(project)}</section>
{sections}
{NextProject(project, catalog[project['next']])}
</main>
<footer id="contact" class="site-footer container" tabindex="-1"><div class="project-footer"><h2>Let's connect</h2><p>Email <a href="mailto:zhouc658@newschool.edu">zhouc658@newschool.edu</a></p><a href="{url('index.html')}">Crystal Zhou</a></div></footer>
</body></html>
'''

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', help='Build one project ID')
    args = parser.parse_args()
    projects = json.loads((ROOT / 'projects/projects.json').read_text())
    catalog = {project['id']: project for project in projects}
    if len(catalog) != len(projects):
        raise ValueError('Duplicate project IDs')
    if args.only and args.only not in catalog:
        parser.error('Unknown project ID')
    # Refresh only mastheads on the three landing pages; their content is untouched.
    for page, active in [('index.html', 'home'), ('work.html', 'work'), ('about.html', 'about')]:
        destination = ROOT / page
        original = destination.read_text()
        updated = re.sub(r'<header class="site-header">.*?</header>', lambda _: SiteHeader(page, active), original, count=1, flags=re.S)
        if updated != original:
            destination.write_text(updated)
    for project in projects:
        if args.only and project['id'] != args.only:
            continue
        destination = ROOT / project['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(render(project, catalog))
        print(project['path'])

if __name__ == '__main__':
    main()
