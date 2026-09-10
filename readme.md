# Gifta Santosa — Portfolio

A single-page personal developer portfolio built as a static site with Middleman. Every piece of content — projects, skills, bio, social links — lives in plain YAML files under `data/`, so updating the site never means touching a template. It ships with a dark/light toggle that remembers your visitors' preference, scroll-triggered entrance animations and active-section nav highlighting driven by IntersectionObserver, and no JavaScript dependencies beyond Bootstrap itself.

## Tech stack

- **[Middleman 4.6](https://middlemanapp.com/)** — Ruby static site generator
- **ERB** — templating
- **YAML** — Middleman's built-in data layer (`data/*.yml`)
- **[Bootstrap 5.3](https://getbootstrap.com/)** — grid and base styles, loaded from CDN with subresource integrity
- **Plain CSS custom properties** — theming, no preprocessor
- **Vanilla JavaScript** — IntersectionObserver, no animation library
- **GitHub Pages** — hosting, deployed via GitHub Actions
- **Ruby 3.3.5** — pinned in `.ruby-version`

## Local setup

```bash
git clone <repo>
cd portfolio
bundle install
bundle exec middleman server
```

Then open **<http://localhost:4567>**.

The server watches `source/` and `data/` and live-reloads the browser when you save. **Changes to `config.rb` are the exception** — restart the server (Ctrl-C, re-run) for those to take effect.

To produce the production build:

```bash
bundle exec middleman build     # writes the static site to build/
```

## Customising the content

Everything you'd normally want to change is in `data/`. No ERB, CSS, or JavaScript required.

| File | What's in it |
|---|---|
| `data/about.yml` | Your name, role, tagline, location, bio paragraphs, quick facts, tech highlights |
| `data/projects.yml` | The project cards — one block per project |
| `data/skills.yml` | Skills grouped by category |
| `data/social.yml` | Social links and the CV download button |
| `data/site.yml` | Page title, meta description, Open Graph tags, nav labels |

Every field is documented with a comment right above it in the file.

### Adding a project

Copy an existing block in `data/projects.yml` and edit it:

```yaml
- title: "My Project"
  description: >-
    Two or three sentences about what it does and how it's built.
  tags:
    - "Ruby on Rails"
    - "PostgreSQL"
  featured: true          # sorted first, gets an accent border + badge
  repo: "https://github.com/you/my-project"
  demo: ""                # leave empty to hide the "Live demo" button
  image: ""               # leave empty for a blank placeholder block
  image_alt: ""
  year: "2025"
```

**Screenshots:** projects currently have `image: ""`, which renders an empty placeholder panel. To add a real one, drop the file into `source/images/projects/` and point at it: `image: "images/projects/my-project.png"`. Use 16:9 (800×450 works well), and fill in `image_alt` so it's described for screen readers.

### Changing the colours

All theming lives in **`source/stylesheets/theme.css`**. The three variables at the top drive everything:

```css
--color-bg: #ffffff;      /* page background   */
--color-primary: #18181b; /* headings, CTAs    */
--color-accent: #6b7280;  /* secondary accents */
```

Dark mode overrides sit in the `[data-bs-theme="dark"]` block further down the same file. Nothing in `site.css` hardcodes a colour, so changing tokens here restyles the whole site.

### Replacing the CV

Overwrite `source/cv/gifta-santosa-cv.pdf` with your real CV, keeping the same filename — nothing else needs to change. To use a different filename, update `cv.path` in `data/social.yml`. Set `cv.enabled: false` to hide the button entirely.

## Deploying to GitHub Pages

### Asset paths — read this first

This site uses Middleman's `relative_assets` (see `config.rb`), which rewrites every asset URL as a relative path at build time. That means **the site works unchanged whether it's served from `username.github.io/portfolio/` or from a custom domain at the root** — there is no base path to configure and get wrong.

The one thing that *does* need your real URL is `site.url` in `data/site.yml`, used for the canonical link and the Open Graph image. Open Graph requires absolute URLs, so set this before sharing the link anywhere:

```yaml
url: "https://giftasantosa.github.io/portfolio"   # no trailing slash
```

### Option A — GitHub Actions (recommended)

`.github/workflows/deploy.yml` is already set up. It builds and publishes on every push to `main`.

1. Push the repo to GitHub with `main` as the default branch.
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`. Watch the run in the **Actions** tab.

No `gh-pages` branch is involved — the workflow uploads the build directly.

### Option B — push a gh-pages branch by hand

The `middleman-gh-pages` gem provides a rake task for this:

```bash
bundle exec rake publish
```

This builds the site and force-pushes `build/` to the `gh-pages` branch of your `origin` remote. Then set **Settings → Pages → Source** to the **`gh-pages` branch**, folder `/ (root)`.

## Troubleshooting

**Blank page after deploying.** On most static-site stacks this means a wrong base path, but `relative_assets` removes that failure mode here. Check instead:
- Open DevTools → Console and Network. A 404 on the CSS or JS tells you the asset path is wrong.
- Confirm Pages is actually pointed at the right source (Actions vs `gh-pages` branch) in Settings → Pages.
- If you removed `relative_assets` from `config.rb`, you now *do* need a base path — set `set :http_prefix, "/your-repo-name"` inside the `configure :build do` block.

**Images or the CV aren't loading.** Files must live under `source/` to end up in the build. `source/images/foo.png` is served at `/images/foo.png`. In templates use the helpers — `image_tag "foo.png"` or `url_for "/cv/file.pdf"` — rather than hardcoding paths, so `relative_assets` and `asset_hash` can rewrite them.

**Stale version showing after a deploy.** Hard refresh with **Cmd+Shift+R** (Ctrl+Shift+R on Windows/Linux). Built assets are content-hashed (`site-f4f8b7ab.css`), so real changes normally bust the cache on their own; `index.html` itself is what GitHub's CDN may hold briefly. Give it a minute.

**Changes to `config.rb` seem to do nothing.** Restart the dev server. Only `source/` and `data/` are watched.

**`bundle install` fails on the Ruby version.** `.ruby-version` pins 3.3.5. Either install it (`rbenv install 3.3.5`) or change that file to the version you have — Middleman 4.6 supports Ruby 3.0+.

**Bootstrap looks broken with no console errors.** The CDN `<link>` and `<script>` in `source/layouts/layout.erb` carry SRI `integrity` hashes. If you bump the Bootstrap version, you must update the hashes too or the browser will silently refuse to load the files. Grab the current ones from the [Bootstrap docs](https://getbootstrap.com/docs/5.3/getting-started/introduction/).

## Project structure

```
portfolio/
├── config.rb                  # Middleman configuration
├── Gemfile                    # Ruby dependencies
├── Rakefile                   # rake publish → gh-pages deploy
├── .ruby-version              # Pins Ruby 3.3.5
├── .github/workflows/         # GitHub Actions deploy workflow
├── data/                      # ← ALL editable content lives here
│   ├── site.yml
│   ├── about.yml
│   ├── projects.yml
│   ├── skills.yml
│   └── social.yml
└── source/
    ├── index.html.erb         # The page — assembles the section partials
    ├── layouts/layout.erb     # HTML shell: meta, OG tags, Bootstrap, scripts
    ├── partials/              # One file per section
    ├── stylesheets/
    │   ├── theme.css          # ← Colour tokens: the only file to edit to reskin
    │   └── site.css           # Layout, components, animations, responsive rules
    ├── javascripts/
    │   ├── theme-toggle.js    # Dark/light mode + localStorage
    │   └── scroll.js          # Active nav link + entrance animations
    ├── images/                # favicon, OG share image, project screenshots
    └── cv/                    # The downloadable CV PDF
```

Each file starts with a one-line comment explaining what it's for.
