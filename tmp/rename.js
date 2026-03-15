const fs = require('fs');
const files = [
  'docs/guides/vercel_terraform_deployment.md',
  'docs/guides/DEPLOYMENT_CLOUD_RUN.md',
  'docs/guides/DEPLOYMENT_HYBRID_SCALING.md',
  'docs/CICD_server.md',
  'docs/[OBSOLETE] DEPLOYMENT.md',
  'package-lock.json',
];
files.forEach((f) => {
  if (fs.existsSync(f)) {
    const data = fs.readFileSync(f, 'utf8');
    const updated = data.replace(/mtcat[-_]next/g, 'mcathcat');
    fs.writeFileSync(f, updated);
  } else {
    console.log('File not found:', f);
  }
});
