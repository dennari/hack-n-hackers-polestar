gitsha=$(git rev-parse HEAD)

git clone git@github.com:uwdata/polestar.git gh-pages
cd gh-pages
git checkout gh-pages
cd ..
gulp
mv gh-pages/.git dist
rm -rf gh-pages
cd dist
git add .
git commit -am "release $gitsha"
git push
cd ..