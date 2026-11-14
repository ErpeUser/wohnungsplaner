# Cloud Build from GitHub

- Keep GitHub as the private source repository. Connect only this repository via the Google Cloud Build GitHub App. Use a push trigger on main; do not use GitHub Actions to deploy.
- Reuse the existing browser suite and Dockerfile. Run the normal GUI checks on each release and keep full-gallery captures on demand. Test the locally packaged image before pushing it by digest to Artifact Registry.
- Run in the e2-standard-2 default pool, with a 15-minute build timeout. Keep short-lived browser reports in a private bucket. Use a dedicated build identity with narrowly scoped access and the existing unprivileged runtime identity.
- Keep Cloud Run private in Belgium, scale between zero and one instance, and verify access and the deployed commit.
