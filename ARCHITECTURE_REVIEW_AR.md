# تقرير مراجعة البنية والبنية التحتية — QBase

## ملخص تنفيذي
تمت مراجعة بنية مشروع QBase (React/TypeScript QMS) على مستوى:
- ملفات البناء والنشر (`package.json`, `vercel.json`, `vite.config.ts`, `tsconfig`)
- التبعيات وثغرات الأمان (`npm audit` + `depcheck`)
- هيكل المشروع (`src/`) ونماذج الكود
- الاختبارات وتغطية الكود
- الميزات المفقودة لنظام إدارة الجودة (QMS)

**عدد الملفات المُحلّلة:** 243 ملف `.ts` / `.tsx`
**حجم الحزمة المُنتَجة:** ~2.4MB (dist/)
**عدد ثغرات الأمان:** 8 ثغرات (منها 2 حرجة)

---

## 1. مشاكل البناء والنشر (Build/Deployment)

### 🔴 حرج — `vercel.json` يفتقر إلى إعدادات SSR و API routes
- الملف يحتوي فقط على `rewrites` و `headers`.
- لا يوجد `buildCommand` أو `framework` محدد — قد يتسبب في بناء غير متوقع على Vercel.
- لا يوجد `env` variables محددة للإنتاج.
- **الإصلاح:** أضف `framework: "vite"` وحدد `buildCommand` و `outputDirectory`.

### 🟠 عالي — `vite.config.ts` يحتوي على `mode === 'test'` داخل التكوين
- `build` يُعادل `{}` في وضع الاختبار، لكن هذا النمط معرض للخطأ لأن Vite لا يستخدم `mode=test` افتراضياً مع Vitest.
- **الإصلاح:** استخدم `defineConfig` بدون شرط mode، وضع إعدادات Vitest في `vitest.config.ts` منفصل.

### 🟡 متوسط — بروكسي API محلي فقط
```ts
proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
```
- هذا يعمل فقط على التطوير المحلي، ولا يوجد بيئة staging.
- **الإصلاح:** استخدم متغيرات البيئة لتحديد عنوان API.

### 🟢 منخفض — `build-timestamp.txt` فارغ
- ملف `build-timestamp.txt` يحتوي على 0 بايت — لا يُستخدم لتتبع الإصدارات.
- **الإصلاح:** أضف خطوة في CI لكتابة التاريخ.

---

## 2. مشاكل التبعيات (Dependencies)

### 🔴 حرج — ثغرات أمان (`npm audit`)
- `concurrently`: ثغرة **حرجة** (shell-quote dependency)
- `shell-quote`: ثغرة **حرجة**
- `axios`: ثغرة **عالية**
- `@xmldom/xmldom`: ثغرة **عالية**
- `postcss`: ثغرة **متوسطة**
- `react-router` / `react-router-dom`: ثغرات **متوسطة**
- **الإصلاح:** شغّل `npm audit fix` أو حدّث التبعيات.

### 🟠 عالي — تبعيات غير مستخدمة (Unused Dependencies)
- `@hookform/resolvers` — غير مستخدم (لا يوجد `zodResolver` في أي مكان)
- `@radix-ui/react-toast` — غير مستخدم (يستخدم `sonner` بدلاً منه)
- `adm-zip` — غير مستخدم في `src/`
- `docxtemplater` + `pizzip` — غير مستخدمين (يُستخدم `docx` فقط)
- `sucrase` — غير مستخدم في بناء الإنتاج
- **الإصلاح:** أزل هذه التبعيات لتقليل حجم الحزمة.

### 🟡 متوسط — تبعيات قديمة ومكررة
- `react-day-picker@8.10.1` — هناك نسخة 9.x جديدة
- `lucide-react@0.462.0` — يمكن التحديث
- `tailwindcss@3.4.17` — يعمل لكن نسخة 4 متاحة
- **الإصلاح:** حدّث التبعيات الأساسية.

### 🟢 منخفض — `axios` مُثبت لكن غير مستخدم
- لم يُستخدم `axios` في أي مكان في `src/` (يُستخدم `fetch` و Supabase client).
- **الإصلاح:** أزل `axios` أو استخدمه بشكل موحد.

---

## 3. هيكل المشروع ونظام الملفات

### 🔴 حرج — إيقاف TypeScript Strict Mode بالكامل
```json
// tsconfig.app.json
"strict": false,
"noImplicitAny": false,
"strictNullChecks": false
```
- هذا يُلغي معظم فوائد TypeScript ويُعرّض الكود لأخطاء وقت التشغيل.
- **الإصلاح:** فعّل `"strict": true` تدريجياً (ابدأ بـ `strictNullChecks`).

### 🟠 عالي — تكرار مكونات Error Boundary
```
src/components/ui/error-boundary.tsx
src/components/ui/ErrorBoundary.tsx
```
- يوجد ملفان مكرران بنفس الاسم (اختلاف فقط في الحروف الكبيرة/الصغيرة).
- قد يسبب مشاكل على أنظمة ملفات غير حساسة لحالة الأحرف (Windows/macOS).
- **الإصلاح:** ادمجهما في ملف واحد.

### 🟠 عالي — استيرادات نسبية (`../`) في Pages بدلاً من Alias `@/`
- صفحات مثل `RecordCreationPage.tsx` و `RecordListPage.tsx` تستخدم `../data/formSchemas` بدلاً من `@/data/formSchemas`.
- هذا يجعل إعادة التنظيم صعبة.
- **الإصلاح:** استخدم `@/` بشكل موحد في كل المشروع.

### 🟡 متوسط — صفحات ضخمة جداً (God Pages)
- `SWOTAnalysisPage.tsx`: **888 سطر**
- `AdminPanel.tsx`: **649 سطر**
- `KPIDashboardPage.tsx`: **646 سطر**
- `RecordViewPage.tsx`: **631 سطر**
- **الإصلاح:** قسّم هذه الصفحات إلى مكونات أصغر.

### 🟡 متوسط — تكرار مكونات UI
- `card.tsx` + `card-new.tsx` — يوجد نسختان من نفس المكون.
- `skeleton.tsx` + `skeletons.tsx` — تكرار.
- **الإصلاح:** حدد النسخة الصحيحة واحذف الأخرى.

### 🟢 منخفض — لا يوجد `index.ts` barrels
- المجلدات مثل `components/ui/` و `hooks/` لا تحتوي على `index.ts` لتسهيل الاستيراد.
- **الإصلاح:** أضف ملفات `index.ts` لكل مجلد رئيسي.

---

## 4. جودة الكود ومشاكل التكرار

### 🟠 عالي — `console.log` و `console.error` في الكود الإنتاجي
```ts
// services/auditLog.ts:111
console.error('[auditLog] Failed to append audit log:', error.message);
// services/logger.ts:40
console.log(...)
```
- يجب استخدام نظام Logging موحد بدلاً من الطباعة على Console.
- **الإصلاح:** استخدم خدمة `logger.ts` بشكل موحد أو أضف Sentry.

### 🟠 عالي — نصوص "سحرية" (Magic Strings) وعناوين URL مُبرمجة
- `http://localhost:3001/api/auth` في `SettingsModal.tsx`
- `window.location.href = isDev ? "http://localhost:3001/api/auth" : "/api/auth"`
- **الإصلاح:** استخدم متغيرات بيئة لجميع العناوين.

### 🟡 متوسط — LocalStorage مباشر بدلاً من Hook
- `localStorage.getItem('accentColor')` في `App.tsx` مباشرة — قد يسبب أخطاء SSR/ hydration.
- **الإصلاح:** استخدم `useLocalStorage` hook.

### 🟡 متوسط — `useAuth.tsx` يحتوي على 901 سطر
- هذا Hook ضخم جداً ويخلط بين:
  - المصادقة المحلية (localStorage)
  - المصادقة عبر Supabase
  - إدارة المستخدمين
- **الإصلاح:** قسّمه إلى `useLocalAuth`, `useSupabaseAuth`, `useUserManagement`.

### 🟢 منخفض — `crypto.randomUUID()` يُستخدم كـ fallback في `auditLog.ts`
```ts
const recordId = record?.id || crypto.randomUUID();
```
- إذا لم يُوجد السجل، سيُنشأ UUID عشوائي لا يتوافق مع قاعدة البيانات.
- **الإصلاح:** أعدل المنطق ليتعامل مع حالة عدم وجود السجل بشكل صحيح.

---

## 5. الاختبارات وتغطية الكود (Testing)

### 🔴 حرج — 3 فقط ملفات اختبار في المشروع بالكامل
- `src/hooks/__tests__/useDebounce.test.ts`
- `src/hooks/__tests__/useFilter.test.ts`
- `src/__tests__/statusService.test.ts`
- **عدد الملفات المُحتَجَب:** 3 من 243 ملف = **1.2%**

### 🟠 عالي — `vitest.config.ts` مفقود
- إعدادات Vitest مدمجة في `vite.config.ts` مع شرط `mode === 'test'`.
- لا يوجد ملف `vitest.config.ts` مستقل.
- **الإصلاح:** أنشئ `vitest.config.ts` منفصلاً.

### 🟡 متوسط — لا يوجد اختبارات E2E
- لا يوجد Playwright أو Cypress.
- **الإصلاح:** أضف Playwright على الأقل للتدفقات الأساسية.

### 🟢 منخفض — `src/test/setup.ts` موجود لكنه قليل الاستخدام
- الملف يحتوي على mock لـ `matchMedia` و `IntersectionObserver`.
- **الإصلاح:** أضف mocks إضافية لـ `localStorage` و `crypto.subtle`.

---

## 6. ميزات QMS المفقودة

### 🔴 حرج — لا يوجد نظام نسخ احتياطي (Backup/Restore)
- تطبيق QMS يتطلب نسخ احتياطي دوري للسجلات.
- لا يوجد API أو واجهة مستخدم للنسخ الاحتياطي.

### 🟠 عالي — لا يوجد نظام استيراد (Import)
- يوجد Export (JSON, CSV, DOCX) لكن لا يوجد Import.
- المستخدم لا يمكنه استيراد سجلات من ملفات Excel/CSV.

### 🟠 عالي — سجل التدقيق (Audit Trail) غير مكتمل
- `auditLog.ts` يُخزّن التغييرات لكن:
  - لا يوجد واجهة مستخدم لعرض Audit Log لكل سجل (فقط في Console).
  - لا يوجد تصفية أو بحث في Audit Logs.
  - لا يوجد تصدير للـ Audit Logs.

### 🟡 متوسط — لا يوجد نظام إشعارات قوي
- `useNotifications.ts` يستخدم polling بدلاً من WebSocket/Realtime.
- Supabase Realtime مُعطل بالكامل (`supabase.realtime.disconnect()`).
- **الإصلاح:** فعّل Realtime أو استخدم Server-Sent Events.

### 🟡 متوسط — لا يوجد نظام التحكم في الوصول (RBAC) دقيق
- الأدوار محدودة: `admin`, `manager`, `auditor`, `user`, `moderator`.
- لا يوجد صلاحيات على مستوى السجلات (Record-level permissions).
- **الإصلاح:** أضف Row-Level Security (RLS) policies في Supabase.

### 🟢 منخفض — لا يوجد نظام التوثيق التلقائي (Auto-Documentation)
- لا يوجد Storybook لتوثيق المكونات.
- لا يوجد JSDoc في الكود.

---

## 7. ملخص الأولويات والإصلاحات المقترحة

| الأولوية | المشكلة | الإجراء |
|-----------|---------|---------|
| **🔴 حرج** | `strict: false` في TypeScript | فعّل `strictNullChecks` + `noImplicitAny` |
| **🔴 حرج** | 8 ثغرات أمان | شغّل `npm audit fix` فوراً |
| **🔴 حرج** | لا يوجد اختبارات | أضف اختبارات لـ Supabase hooks وصفحات رئيسية |
| **🟠 عالي** | تكرار مكونات UI | ادمج `error-boundary.tsx`, `card.tsx`, `skeleton.tsx` |
| **🟠 عالي** | استيرادات نسبية في Pages | استخدم `@/` في كل الصفحات |
| **🟠 عالي** | `useAuth.tsx` ضخم (901 سطر) | قسّم إلى 3 hooks |
| **🟠 عالي** | لا يوجد Import/Backup | أضف ميزات Import من CSV وBackup تلقائي |
| **🟡 متوسط** | صفحات ضخمة | قسّم SWOTAnalysisPage و AdminPanel |
| **🟡 متوسط** | Console.log في الإنتاج | استخدم Logger موحد |
| **🟢 منخفض** | `vercel.json` يحتاج تحديث | أضف `framework: "vite"` |

---

## 8. ملاحظات إيجابية

- ✅ استخدام Lazy Loading في `App.tsx` يقلل حجم الحزمة الأولي.
- ✅ Manual Chunks في Vite تحسّن التخزين المؤقت (caching).
- ✅ Error Boundaries على مستوى الصفحات.
- ✅ استخدام `zod` للتحقق من البيانات.
- ✅ `tailwind-merge` + `clsx` لإدارة CSS classes.
- ✅ `react-query` لإدارة حالة البيانات.

---

**تاريخ التقرير:** 2026-06-11
**المُراجع:** Hermes Subagent
**المسار:** `/mnt/ahmed/Projects/qbase/ARCHITECTURE_REVIEW_AR.md`
