"""Contract checks for generated pages and the reusable media renderer."""
import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_projects', ROOT / 'scripts/build_projects.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.nodes = []
        self.stack = []
        self.errors = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.nodes.append((tag, attrs))
        if tag == 'a' and 'a' in self.stack:
            self.errors.append('Nested links')
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.errors.append('Unexpected closing tag: ' + tag)
        else:
            self.stack.pop()

class ProjectsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.projects = json.loads((ROOT / 'projects/projects.json').read_text())
        cls.catalog = {p['id']: p for p in cls.projects}

    def test_static_pages_are_current_and_well_formed(self):
        for project in self.projects:
            with self.subTest(project=project['id']):
                source = (ROOT / project['path']).read_text()
                self.assertEqual(source, build.render(project, self.catalog))
                page = Page(source)
                self.assertEqual(page.errors, [])
                self.assertEqual(page.stack, [])
                self.assertEqual(sum(t == 'h1' for t, _ in page.nodes), 1)
                ids = [a['id'] for _, a in page.nodes if 'id' in a]
                self.assertEqual(len(ids), len(set(ids)))
                self.assertIn('section-01', ids)
                for tag, attrs in page.nodes:
                    if tag == 'img':
                        self.assertIn('alt', attrs)
                    if tag == 'iframe':
                        self.assertTrue(attrs.get('title'))
                    if tag == 'video':
                        self.assertIn('controls', attrs)
                        self.assertIn('playsinline', attrs)
                        self.assertNotIn('autoplay', attrs)
                        self.assertEqual(attrs['preload'], 'metadata')

    def test_local_assets_links_and_anchors_exist(self):
        for name in [p['path'] for p in self.projects] + ['index.html', 'work.html']:
            page = Page((ROOT / name).read_text())
            self.assertEqual(page.errors, [], name)
            ids = {a['id'] for _, a in page.nodes if 'id' in a}
            for tag, attrs in page.nodes:
                for key in ('src', 'href', 'poster'):
                    if key not in attrs:
                        continue
                    url = urlparse(attrs[key])
                    if url.scheme or url.netloc:
                        continue
                    with self.subTest(page=name, url=attrs[key]):
                        if url.path:
                            self.assertTrue(((ROOT / name).parent / unquote(url.path)).exists())
                        elif url.fragment:
                            self.assertIn(url.fragment, ids)

    def test_all_layouts_are_used_and_next_chain_reaches_all_projects(self):
        layouts = {s['layout'] for p in self.projects for s in p['sections']}
        self.assertEqual(layouts, build.LAYOUTS)
        visited = set()
        current = 'furumi'
        while current not in visited:
            visited.add(current)
            current = self.catalog[current]['next']
        self.assertEqual(current, 'furumi')
        self.assertEqual(visited, set(self.catalog))

    def test_loop_is_muted_and_full_film_does_not_autoplay(self):
        loop = build.MediaBlock({'type':'loop', 'src':'clip.mp4', 'title':'Short excerpt'}, 'demo/index.html')
        attrs = next(a for t, a in Page(loop).nodes if t == 'video')
        self.assertIn('muted', attrs)
        self.assertIn('loop', attrs)
        self.assertIn('data-decorative-loop', attrs)
        film = build.ProjectHero(self.catalog['motion'])
        self.assertNotIn('data-decorative-loop', film)
        self.assertNotIn('autoplay', film)

    def test_renderer_escapes_copy_and_supports_caption_tracks(self):
        source = build.MediaBlock({'type':'video', 'src':'film.mp4', 'title':'<Film>', 'poster':'poster.jpg', 'tracks':[{'src':'en.vtt','lang':'en','label':'English'}]}, 'demo/index.html')
        self.assertIn('&lt;Film&gt;', source)
        self.assertIn('kind="captions"', source)
        self.assertIn('poster="../poster.jpg"', source)
        self.assertEqual(build.paragraphs(['<script>alert(1)</script>']), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')

if __name__ == '__main__':
    unittest.main()
