# Анализ данных GEOASR API

## 3 эндпоинта (PostgREST API)

**Базовый URL:** `https://duasr.uz/api4/`

**Авторизация:** Bearer token (см. `data_source.md`)

| API | Что это | Всего записей | В Ташкенте |
|-----|---------|---------------|------------|
| `/api4/maktab44` | **Школы** (umumiy o'rta ta'lim maktab) | 800 | 6 (выборочно) |
| `/api4/bogcha` | **Детсады** (bog'cha) | 400+ | ~38 ("Toshkent sh") |
| `/api4/ssv` | **Медучреждения** (санэпидем, поликлиники) | 400+ | 1 |

## Поля школ (`maktab44`)

| Поле | Значение | Для проекта |
|------|----------|-------------|
| `obekt_nomi` / `obekt_nomi_ru` | Название школы (узб/рус) | **Название на карте** |
| `viloyat` / `tuman` | Область / район | **Фильтрация по районам** |
| `inn` | ИНН учреждения | **Матчинг с etender** (тендеры привязаны к ИНН) |
| `code` / `parent_code` | Код объекта | **Уникальный идентификатор** |
| `sigimi` | Вместимость | Контекст на карточке школы |
| `umumiy_uquvchi` | Количество учеников | Контекст (переполненность) |
| `qurilish_yili` | Год постройки | Приоритизация (старые здания) |
| `kapital_tamir` | Год капремонта | **Ключевое** — видно когда был ремонт |
| `material_sten` | Материал стен | Контекст состояния |
| `sport_zal_holati` | Состояние спортзала | **Можно генерить обещания** |
| `aktiv_zal_holati` | Состояние актового зала | **Можно генерить обещания** |
| `oshhona_holati` | Состояние столовой | **Можно генерить обещания** |
| `elektr_kun_davomida` | Электричество | Статус инфраструктуры |
| `ichimlik_suvi_manbaa` | Источник воды | Статус инфраструктуры |
| `internetga_ulanish_turi` | Тип интернета | Статус инфраструктуры |

## Регионы в базе

Andijon viloyati, Buxoro viloyati, Farg'ona viloyati, Jizzax viloyati, Namangan viloyati, Navoiy viloyati, Qashqadaryo viloyati, Qoraqolpog'iston Respublikasi, Samarqand viloyati, Sirdaryo viloyati, Surxondaryo viloyati, **Toshkent shahar**, Toshkent viloyati, Xorazm viloyati

## Районы Ташкента (в maktab44)

Yangihayot tumani, Chilonzor tumani, Yunusobod tumani, Shayxontoxur tumani, Mirzo Ulugʻbek tumani, Uchtepa tumani

## Значения статусных полей

- `sport_zal_holati`: `sport_zal_umuman_yuq` (нет), `sport_zal_qoniqarli` (удовлетворительно)
- `aktiv_zal_holati`: `aktiv_zal_umuman_yuq` (нет), `aktiv_zal_qoniqarli` (удовлетворительно)
- `oshhona_holati`: `oshhona_umuman_yuq` (нет), `oshhona_bor_ishlamaydi` (есть, не работает), `oshhona_holati_qoniqarli` (удовлетворительно)
- `elektr_kun_davomida`: `elektr_bor` (есть), `elektr_qisman` (частично)
- `ichimlik_suvi_manbaa`: `ichimlik_suvi_manbaa_markaz` (центральное), `ichimlik_suvi_manbaa_lokal` (локальное), `ichimlik_suvi_manbaa_olib_kelinadi` (привозная), `ichimlik_suvi_yuq` (нет)
- `internetga_ulanish_turi`: `internet_optika` (оптика), `internet_mobil` (мобильный), `umuman_yuq` (нет)
- `kapital_tamir`: год ремонта или пусто

## Ключевые выводы

1. **Координат нет** — API не содержит lat/lon. Нужно геокодировать школы по названию+район (через Nominatim/Google Geocoding) или добавить вручную для MVP.

2. **ИНН — золото для etender** — поле `inn` позволяет автоматически матчить тендеры с школами. На etender.uzex.uz контракты привязаны к ИНН заказчика.

3. **Статусы инфраструктуры** — поля `sport_zal_holati`, `oshhona_holati`, `aktiv_zal_holati` уже содержат информацию о проблемах (`umuman_yuq` = вообще нет). Это можно использовать для **автоматической генерации "базовых обещаний"** — если спортзала нет, система может предложить отслеживать его строительство.

4. **Всего 6 школ Ташкента** — API содержит выборочные данные, не все школы. Для MVP достаточно, но для масштаба нужно будет дополнить (в Ташкенте ~600 школ).

5. **Bogcha и SSV** — детсады и медучреждения имеют похожую структуру. Можно расширить платформу за рамки школ в будущем.

## Операторы фильтрации API

| Оператор | Описание | Пример |
|----------|----------|--------|
| `eq` | Равно | `?viloyat=eq.Toshkent shahar` |
| `neq` | Не равно | `?viloyat=neq.Samarqand viloyati` |
| `like` | LIKE (с учётом регистра) | `?material_sten=like.%beton%` |
| `ilike` | LIKE (без регистра) | `?tuman=ilike.%yangi%` |
| `in` | Из списка | `?viloyat=in.(Toshkent shahar,Fargona viloyati)` |
| `gt` / `gte` / `lt` / `lte` | Сравнение | `?sigimi=gt.500` |
| `is.null` / `not.is.null` | NULL-проверка | `?material_sten=is.null` |
