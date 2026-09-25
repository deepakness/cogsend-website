# Security policy

This repository is the static site at cogsend.com. It has no server code, no
forms, no cookies and no accounts, so most security reports belong to the app:
see the [app's security policy](https://github.com/deepakness/cogsend/blob/main/SECURITY.md).

Report privately, not in a public issue — through GitHub's private vulnerability
reporting on either repository, or by email to **me@deepakness.com** — anything
that affects the site itself, for example:

- a way to inject script or markup into a page, including through the docs search;
- a gap in the Content Security Policy or the other headers in `public/_headers`;
- a build step that could publish something it should not.

Only `main` is supported.
