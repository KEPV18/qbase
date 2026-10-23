#!/bin/bash
# Deploy the app to the Vercel PRODUCTION alias, against the LIVE Supabase.
#
#   bash tools/local-stack/deploy-live.sh
#
# It refuses to deploy a dead build.  The check comes first and it is not
# a formality: the project's API hostname is currently gone (the project
# is paused), and the production deployment in Vercel is built against
# that hostname — so a deploy made now would replace a broken build with
# an equally broken one, and would look like it worked.
#
# When the project is restored, the check goes green and this deploys.
#
# No build env is overridden here: the Vercel project already holds the
# live VITE_SUPABASE_URL and the live anon key for Production, and the
# build has to use those, not the local ones.  The local .env.local is
# excluded from the upload by .gitignore.
set -u
REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"

cd "$REPO" || exit 1

echo "── checking the live project"
if ! bash "$TOOLS/check-live.sh"; then
  echo
  echo "Refusing to deploy: the live project is not answering."
  echo "Restore it in the Supabase dashboard, then run this again."
  exit 1
fi

echo
echo "── deploying to production"
npx vercel deploy --prod --yes 2>&1 | tail -8

echo
echo "── checking the deployed site"
sleep 5
for js in $(curl -s https://qbase-sable.vercel.app/ | grep -oE '/assets/[a-zA-Z0-9._-]+\.js' | sort -u); do
  ref=$(curl -s "https://qbase-sable.vercel.app$js" | grep -oE '[a-z0-9]{20}\.supabase\.co' | sort -u | head -1)
  [ -n "$ref" ] && { echo "   the build points at $ref"; break; }
done
echo "   site HTTP $(curl -s -o /dev/null -w '%{http_code}' https://qbase-sable.vercel.app/)"

echo
echo "production: https://qbase-sable.vercel.app"
echo "login with a PRODUCTION account — the local password in"
echo "LOCAL_LOGIN.txt is a local-only one and will not work here."
