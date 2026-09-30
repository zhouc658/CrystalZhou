# Editorial project pages

Edit `projects/projects.json`, then run from the repository root:

```sh
python3 scripts/build_projects.py
```

Or rebuild just Furumi: `python3 scripts/build_projects.py --only furumi`.

Generated HTML is ready to deploy and works directly from disk or on GitHub Pages. No server, framework, runtime fetch, or package installation is needed. The masthead comes from `templates/site-header.html`; its existing responsive styles live in `css/global.css`. The build also synchronizes only the masthead markup on Home, Work, and About. All pages use `css/global.css`, `css/project.css`, `js/main.js`, and `js/project.js`. Do not edit generated project HTML: a rebuild replaces it.

## Create a project

Copy a project record, assign a unique `id` and `path`, and change:

- `title`, `description`, `category`, `year` (empty omits the year)
- `annotation`: optional array of note lines; omit for no paper note
- `hero`: one media record
- `overview`: array of paragraphs
- `role`, `tools`: arrays; empty arrays show “Details to come”
- `sections`: any number of sections, shown with unnumbered serif headings after Overview
- `thumbnail`: optional site-relative preview image for Next Project
- `next`: the next project's ID

Add a link to the new `path` in Home or Work. Paths in the data are relative to the repository root; the generator calculates the correct relative paths for each output page. Existing project URLs are retained.

`_todo` and `_source` are editor notes and are never displayed. `placeholder` section text and placeholder media **are visible** so unfinished copy cannot be mistaken for a completed case study. Generated placeholder markup also contains TODO comments. Furumi and Jewelry media, role, tools, and final case-study copy remain unconfirmed. Motion uses the supplied full film, six storyboard sheets, four animated GIFs, and confirmed project copy. Its local styling lives in `MLP/motion.css`; editorial supplements live in `templates/motion-*.html`. Optional `title_lines`, `stylesheet`, and section `supplement` fields preserve these choices on rebuild. `preview_category` preserves the existing label on incoming next-project links.

## Section layouts

Each section accepts `title`, `layout`, `paragraphs`, `media`, optional `links`, optional `code`, and optional `placeholder` text.

| Layout | Presentation |
| --- | --- |
| `text-image` | Text left, media right |
| `image-text` | Media left, text right; text first on mobile |
| `full` | Copy followed by full-width media; multiple images form a vertical sequence |
| `pair` | Two media columns, preserving each item's ratio |
| `collage` | Controlled asymmetric composition for 2–4 media items |
| `strip` | Responsive process grid |
| `text` | Copy or links without artwork |

Example:

```json
{
  "title": "Visual direction",
  "layout": "image-text",
  "paragraphs": ["Replace this with your verified project narrative."],
  "media": [{
    "type": "image",
    "src": "Furumi/screens.png",
    "alt": "Describe the actual interface shown",
    "caption": "Optional short caption"
  }]
}
```

Use short artwork-led sections for graphic design, concept/storyboard/motion sections for films, and how-it-works/interaction sections for creative technology. Research and outcome claims should only be added when supported by your project documentation.

## Media records

Images (including GIF files) preserve their natural ratio. For animation with reduced-motion support, prefer `loop` video to an animated GIF.

```json
{"type":"image", "src":"logo/front.JPG", "alt":"Identity card front", "shape":"portrait", "width":750, "height":1050}
```

`shape` may be `natural` (default), `portrait` (narrower), or `square`. It adjusts maximum display width without cropping. Image dimensions are optional but recommended to prevent layout shifts. `caption` is optional for every media type.

Full video — native controls, no autoplay:

```json
{"type":"video", "src":"MLP/Crystal-Zhou_Project-01_1920x1080.mp4", "title":"Full film", "poster":"MLP/poster.jpg", "tracks":[{"src":"MLP/captions-en.vtt", "lang":"en", "label":"English"}]}
```

Only reference poster/caption files after adding the actual assets. No transcripts or captions are fabricated.

Short 3–6 second decorative excerpt:

```json
{"type":"loop", "src":"MLP/excerpt.mp4", "title":"Typography motion detail", "poster":"MLP/excerpt.jpg"}
```

Loops are muted, keep native controls, and play only in view when reduced motion is off. They pause offscreen and in background tabs. Without JavaScript or IntersectionObserver, they remain manually playable. Full films never enter this autoplay controller.

Embed:

```json
{"type":"embed", "src":"https://www.youtube.com/embed/VIDEO_ID", "title":"Project demonstration", "ratio":[16,9]}
```

Interactive embeds use the same record with a descriptive title and a suitable ratio. Add a direct link in `links` when useful. Embeds load lazily. External demos may require an HTTP server rather than a `file://` preview:

```sh
python3 -m http.server 8000
```

Placeholder:

```json
{"type":"placeholder", "label":"Final interface", "shape":"landscape"}
```

## Validation

```sh
python3 -m unittest discover -s tests
node --check js/project.js
node tests/project-media.test.cjs
```

Preview Furumi, a portrait poster, the newsletter, and Motion at desktop and mobile widths after changing the shared CSS. Verify keyboard navigation, native video playback, and the Next Project / Back to Work links.
