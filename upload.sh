#!/bin/bash
# run with --dryrun to see what will happen
rm -rf compiled
mkdir compiled
cat `grep 'src="/' views/embedded_scripts.erb | sed 's/.*"\/\([^"]*\)".*/public\/\1/'` > compiled/mm-embedded.js
mkdir compiled/e
cp public/e/* compiled/e/
grunt compile
if [[ $1 != "--static" ]]; then
  for c in compiled/*.css; do gsed s/static.mindmup.com/d23c2zpg6dm0n.cloudfront.net/g $c -i; done
  for c in compiled/e/*.css; do gsed s/static.mindmup.com/d23c2zpg6dm0n.cloudfront.net/g $c -i; done
else
  for c in compiled/*.css; do gsed s/\\/\\/static.mindmup.com/..\\/static/g $c -i; done
  for c in compiled/e/*.css; do gsed s/\\/\\/static.mindmup.com/..\\/..\\/static/g $c -i; done
fi
rc=$?
if [[ $rc != 0 ]] ; then
  echo "grunt failed, bailing out"
  exit $rc
else
  if [[ $1 != "--static" ]]; then
    ts=`date +%Y%m%d%H%M%S`
    aws s3 sync $1 --acl public-read compiled s3://static.mindmup.com/compiled/$ts
    echo 'set :compiled_ts,"'$ts'"' > compiled_ts.rb
  fi
fi
