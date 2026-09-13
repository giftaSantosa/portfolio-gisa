# Middleman site configuration. Controls how source/ is turned into build/.
# Restart `middleman server` after editing this file — changes are not live-reloaded.

# --- Templating -------------------------------------------------------------

# Strip whitespace intelligently in ERB tags so the generated HTML stays tidy.
set :erb, trim: "-"

# Where partials live. Referenced in templates as `partial "partials/nav"`.
set :partials_dir, "partials"

# --- Pretty URLs ------------------------------------------------------------

# Turn /about.html into /about/, so links never need a .html suffix.
activate :directory_indexes

# Make url_for/link_to output RELATIVE links between pages (../../#projects
# rather than /#projects), for the same reason relative_assets exists below:
# the site is served from a /portfolio/ sub-path, where a root-relative link
# would point outside it.
set :relative_links, true

# --- Markdown ---------------------------------------------------------------

# Case studies are written in Markdown (source/projects/*.html.md).
# auto_ids gives every heading an id, which the table of contents links to.
set :markdown_engine, :kramdown
set :markdown, auto_ids: true, smart_quotes: %w[lsquo rsquo ldquo rdquo]

# --- Files to leave out of the build ----------------------------------------

# Keeps the empty screenshot folder in git without shipping the note file.
ignore "images/projects/.gitkeep"

# --- Layout -----------------------------------------------------------------

# Every page uses source/layouts/layout.erb unless it says otherwise.
set :layout, :layout

# --- Development-only settings ---------------------------------------------

configure :development do
  # Auto-refresh the browser when a source file changes.
  activate :livereload
end

# --- Build-only settings ----------------------------------------------------

configure :build do
  # Rewrite every asset URL as a RELATIVE path (../images/foo.png instead of
  # /images/foo.png). This is what makes the site work unchanged whether it is
  # served from https://username.github.io/portfolio/ (a project page) or from
  # a custom domain at the root. If you have seen a static site deploy as a
  # blank page because of a wrong base path, this setting is the fix.
  activate :relative_assets

  # Minify CSS and JavaScript in the built output.
  activate :minify_css
  activate :minify_javascript

  # Append a content hash to asset filenames (site-a1b2c3.css) so browsers
  # pick up changes immediately instead of serving a stale cached copy.
  activate :asset_hash

  # GitHub Pages does not serve Jekyll-ignored directories unless told not to
  # run Jekyll at all. The .nojekyll file is created by the deploy workflow.
end
