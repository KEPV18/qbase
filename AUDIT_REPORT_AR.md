# تقرير المراجعة الشاملة — مشروع QBase
## تاريخ التقرير: 2026-06-11

---

## التقييم العام: مقبول (Fair)

المشروع بني ويعمل في الإنتاج بنجاح، لكن يوجد أخطاء ESLint حرجة، استخدام `any`، `console.log` متبقيّة، واعتماديات قديمة.

---

## الإحصائيات الرئيسية

| المقياس | القيمة |
|---------|--------|
| إجمالي سطور الكود (src/) | ~49,810 |
| ملفات (src/) | 246 |
| مكونات React (.tsx) | 180 |
| ملفات TypeScript (.ts) | 63 |
| صفحات (src/pages) | 30 صفحة |
| نماذج قوالب (templates) | 37 قالب |
| مكتبات hooks | 23 |
| خدمات (services) | 9 |
| سجلات قاعدة البيانات | 249 |
| أكبر صفحة (SWOTAnalysisPage) | 888 سطر |

---

## نتائج البناء

| الأمر | النتيجة |
|-------|---------|
| `npm run build` | ✅ نجاح — 3.69s — 1988 وحدة |
| `tsc --noEmit` | ✅ 0 أخطاء |
| `npm run lint` | ❌ 22 خطأ + 26 تحذير |

---

## الأخطاء الحرجة (Critical — يجب الإصلاح)

### 1. أخطاء ESLint (22 خطأ)
- **`no-explicit-any`** في 9 ملفات (مثل `src/pages/RecordCreationPage.tsx` و `src/hooks/useAuth.tsx` و `src/services/recordStorage.ts`)
- **`prefer-const`** في `src/services/recordStorage.ts:173`
- **`no-require-imports`** في `tailwind.config.ts:160`
- **`no-case-declarations`** في `src/lib/traceability.ts:478,503`
- **`no-empty`** في `src/hooks/useAuth.tsx:697,707`

### 2. `console.log` متبقيّة في الإنتاج (5 مواقع)
- `src/pages/RecordCreationPage.tsx` (2)
- `src/services/auditLog.ts:115`
- `src/services/logger.ts:39`
- `src/services/recordStorage.ts:65`

### 3. استخدام `any` مباشر في pages
- `RecordCreationPage.tsx` — `onSuccess: (result: any)` و `(err: any)`
- يفضل استخدام `unknown` ثم تضييق النوع

### 4. قاعدة البيانات
- **سجل `TEST`** موجود بـ `form_code = "TEST"` (غير قياسي)
- **جميع السجلات** تحتوي على مفاتيح غير معروفة (stray keys) بسبب تنوع `form_data` حسب النموذج

---

## التحذيرات (Warnings — يُفضّل إصلاحها)

| التحذير | التكرار |
|---------|---------|
| `react-hooks/exhaustive-deps` | 5 مواقع (useEffect/missing deps) |
| `react-refresh/only-export-components` | 17 ملف (تصدير constants مع components) |
| `no-unused-vars` معطّل في ESLint | — |
| browserslist قديم (12 شهر) | — |

---

## الاعتماديات (Dependencies)

### معرّضة للتحديث
- `react` و `react-dom` 18.3 → 19.x (أنواع @types/react قديمة)
- `vite` 7.3.1 → 8.x
- `@vitejs/plugin-react-swc` 3.11 → 4.3
- `@supabase/ssr` 0.10 → 0.12
- `@tanstack/react-query` 5.83 → 5.101
- جميع مكونات `@radix-ui/*` متأخرة بإصدارات صغيرة

### غير مستخدمة حسب `depcheck` (تخمين)
- `@hookform/resolvers` (غير محسومة)
- `adm-zip`, `docxtemplater`, `pizzip`, `sucrase`
- `@radix-ui/react-toast`

### مفقودة
- `googleapis` مستورد في `src/schemas/serialAndDate.ts` لكن غير مدرجة في `package.json`

---

## أمن

- ✅ **لا توجد أسرار مكتوبة مباشرة** في الكود (تستخدم `import.meta.env`)
- ⚠️ `.env.local` يحتوي على مفاتيح Supabase (Service Role + Anon + Vercel OIDC) — **يجب تأمينها**
- ⚠️ Realtime WebSocket معطّل يدوياً في `client.ts` (عملية workaround جيدة)
- ⚠️ `dangerouslySetInnerHTML` مستخدمة في `src/components/ui/chart.tsx:70`

---

## ملاحظات على الملفات المهمة

### `src/pages/*.tsx`
- كل الصفحات كبيرة (100–900 سطر)
- `RecordCreationPage.tsx` يحتوي على `any` و `console.log`
- `useAuth.tsx` يحتوي على `empty block` و `any`

### `src/components/forms/templates/*.tsx`
- 37 قالب — إجمالي ~5,940 سطر
- بعضها يفتقر `key` prop صحيح في `map()`
- بعض النماذج تستخدم `useMemo` لكن البيانات ثابتة

### `src/data/formSchemas.ts`
- تعريف ~35 نموذج
- `defaultValue: "auto"` للـ serial — منطق مخصص

### `src/schemas/formValidation.ts`
- استخدام `zod` 4.3.6
- `any` مستخدم في 3 مواقع (مثل `:662`)

---

## توصيات

1. **إصلاح ESLint** (`npm run lint -- --fix` ثم تصحيح `any` يدوياً)
2. **إزالة `console.log`** من الإنتاج أو تحويلها لـ logger منظم
3. **تحديث Vite** و `@supabase/ssr` و `@tanstack/react-query`
4. **حذف سجل `TEST`** من قاعدة البيانات
5. **تفعيل `no-unused-vars`** في ESLconfig
6. **تقسيم الصفحات الكبيرة** (SWOTAnalysisPage 888 سطر) لملفات فرعية
7. **إضافة `googleapis`** إلى `package.json` إذا ضروري
8. **مراجعة `dangerouslySetInnerHTML`** في `chart.tsx`
9. **إضافة `react-error-boundary` عام** لالتقاط أخطاء الصفحات
10. **إعداد `husky` + `lint-staged`** لمنع الـ commits غير النظيفة

---

*تم إنشاء هذا التقرير تلقائياً باستخدام cloc, ESLint, tsc, depcheck, و Python DB audit.*
