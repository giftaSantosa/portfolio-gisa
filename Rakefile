# Rake tasks for deployment. Provides `rake build` and `rake publish`.
#
#   bundle exec rake publish
#
# builds the site into build/ and force-pushes it to the `gh-pages` branch of
# your `origin` remote. Requires the repo to already have a git remote set up.

require "middleman-gh-pages"

# The git remote to push the built site to.
ENV["REMOTE_NAME"] ||= "origin"

# The branch GitHub Pages serves from.
ENV["BRANCH_NAME"] ||= "gh-pages"
