@echo off
echo 🔧 Fixing Prisma Client Issues...
echo.

cd /d "c:\Users\viren\Downloads\windsurf-project\SEO Link Building Final\backend"

echo 🗑️ Cleaning Prisma client...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma\client 2>nul

echo 📦 Reinstalling Prisma client...
npm install @prisma/client

echo 🔄 Regenerating Prisma client...
npx prisma generate --force

echo 🗄️ Pushing schema to database...
npx prisma db push --force-reset

echo ✅ Prisma client fixed!
echo.
echo Now you can run: npm run dev
pause
