# Infrastructure

SRE Track is served as a static site from a private S3 bucket through CloudFront, on a subdomain of a domain already hosted in Route 53. Everything is one CloudFormation stack, `site.yaml`.

## Prerequisites

- AWS CLI v2 with credentials for the target account.
- A Route 53 **public hosted zone** for the parent domain, e.g. `example.com`. The site lives on a subdomain of it, e.g. `sre.example.com`.
- Node, already required by the `tools/` scripts.

## Why us-east-1

CloudFront can only use an ACM certificate issued in **us-east-1**, and CloudFormation cannot create a resource in another region from within one stack. Deploying the whole stack there keeps this to a single template. The bucket's region is irrelevant to visitors because CloudFront caches globally and the payload is 528 KB.

## One-time creation

```bash
aws cloudformation deploy --region us-east-1 --stack-name sre-track-site --template-file infra/site.yaml --parameter-overrides DomainName=sre.example.com HostedZoneId=Z0123456789ABCDEFGHIJ AlarmEmail=you@example.com
```

`HostedZoneId` is the zone of the **parent** domain, not the subdomain. Get it with:

```bash
aws route53 list-hosted-zones-by-name --dns-name example.com --query 'HostedZones[0].Id' --output text
```

Creation takes roughly 5 to 10 minutes, most of it CloudFront propagation. Certificate validation is the step that can stall: the template writes the validation record into the hosted zone itself, so if the stack sits in `CREATE_IN_PROGRESS` for more than a few minutes on the certificate, `HostedZoneId` is almost certainly wrong or points at a private zone.

If you passed `AlarmEmail`, confirm the SNS subscription from your inbox or the alarm has nowhere to send.

## Deploying the site

```bash
node tools/deploy.js --profile kb-AdministratorAccess
```

Identical in PowerShell, cmd and bash. Pass the profile as a flag rather than an environment variable, since `AWS_PROFILE=... node ...` is bash-only syntax and fails in PowerShell.

That runs the three content validators, refuses to publish if any fails, reads the bucket and distribution from the stack outputs, syncs the 24 runtime files, pins content types, and invalidates the edge cache.

| Flag | Effect |
|---|---|
| `--profile <name>` | AWS profile; falls back to `AWS_PROFILE` |
| `--stack <name>` | Stack to read outputs from, default `sre-track-site` |
| `--region <name>` | Default `us-east-1` |
| `--dry-run` | Print the AWS commands without running them |
| `--skip-checks` | Bypass the content validators |
| `--no-wait` | Do not wait for the invalidation to finish |

The script publishes from an **allowlist** built from `i18n/manifest.js`, staged into a temp directory, rather than syncing the repo root with exclusions. A denylist is one typo away from publishing `.git` to a CDN.

## How caching works

There is no build step, so filenames never change and cannot carry a content hash. The two lifetimes are split in the `Cache-Control` header instead:

| Object | Header | Effect |
|---|---|---|
| `index.html` | `public, max-age=0, must-revalidate` | Browser revalidates on every load |
| everything else | `public, max-age=300, s-maxage=86400` | 5 min in the browser, 1 day at the edge |

An invalidation clears the edge but not browsers, which is why the browser TTL stays short. Worst-case staleness after a deploy is 5 minutes. A `/*` invalidation counts as one path against the 1,000 free paths per month.

## Deliberate omissions

- **No 403/404 to `index.html` rewrite.** The app has no client-side routing, so there is no URL to recover. Mapping errors to the app would turn a missing content file into a silently served HTML page instead of a diagnosable 404.
- **No S3 website hosting.** The bucket is private and reached only through the REST endpoint with Origin Access Control, so there is no path where S3 serves the public directly.
- **No access logging.** Add `Logging` to the distribution and a log bucket if you ever need it; it is off to keep the bill at zero and avoid a bucket nobody reads.

## Security headers

The response headers policy sets HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a CSP derived from what the app actually does, not from a template:

```
default-src 'self'; script-src 'self';
style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'none';
frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

`script-src` is strict because there are no inline `<script>` blocks or `on*` attributes. **`style-src` must keep `'unsafe-inline'`**: `app.js` writes inline `style` attributes for the XP bar and the boss health meter, and removing it makes those render at zero width with no error the user would notice. The Google Fonts entries are required by the stylesheet link in `index.html`.

To verify a CSP change without deploying, copy `index.html`, add the policy as a `<meta http-equiv="Content-Security-Policy">` before the stylesheet link, serve it locally and check the console.

## Verifying a deploy

```bash
curl -sSI https://sre.example.com/ | grep -Ei 'HTTP/|cache-control|strict-transport|content-security'
curl -sSI https://sre.example.com/app.js | grep -i content-type
curl -sSI https://sre.example.com/does-not-exist.js | head -1
```

`app.js` must report `text/javascript`. If it ever reports `application/octet-stream` the browser refuses to execute it and the page renders blank; the deploy script pins the type explicitly to prevent that. The missing path must return 404, not 200.

## Rollback

The bucket is versioned. To roll back one file, restore its previous version and invalidate. To roll back everything, check out the previous commit and re-run `node tools/deploy.js`, which is usually faster and always clearer.

## Tearing down

```bash
aws s3 rm s3://<bucket> --recursive
aws cloudformation delete-stack --region us-east-1 --stack-name sre-track-site
```

The bucket has `DeletionPolicy: Retain`, so it survives stack deletion on purpose and must be emptied and deleted by hand. CloudFormation cannot delete a non-empty bucket anyway.

## Cost

Effectively zero. CloudFront's perpetual free tier covers 1 TB out and 10 million requests a month, the bucket holds 528 KB, ACM is free, and the hosted zone already exists. Expect well under a dollar a month.
