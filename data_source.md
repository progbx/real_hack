API Keys for GEOASR

https://duasr.uz/api4/maktab44 -H "Authorization: Bearer  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoid2ViX3VzZXIiLCJleHAiOjE3Nzk4Mzk0ODV9.WCy4ooIDvL0o8G5udEuba4POyJMMH2CnjM2FcgybG10"

https://duasr.uz/api4/bogcha -H "Authorization: Bearer  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoid2ViX3VzZXIiLCJleHAiOjE3Nzk4Mzk0ODV9.WCy4ooIDvL0o8G5udEuba4POyJMMH2CnjM2FcgybG10"

https://duasr.uz/api4/ssv -H "Authorization: Bearer  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoid2ViX3VzZXIiLCJleHAiOjE3Nzk4Mzk0ODV9.WCy4ooIDvL0o8G5udEuba4POyJMMH2CnjM2FcgybG10" 



| Operator | O'zbekcha | Misol (URL query) | Natija |
| :--- | :--- | :--- | :--- |
| eq | Teng (=) | `/maktab?viloyat=eq.Toshkent viloyati` | Faqat Toshkent viloyatidagi maktablar |
| neq | Teng emas (!=) | `/maktab?viloyat=neq.Samarqand viloyati` | Samarqand viloyatidan tashqari maktablar |
| like | Matn bo'yicha qidirish (LIKE) | `/maktab?devor_materiali=like.%beton%` | Devor materiali "beton" bo'lgan maktablar |
| ilike | Matn qidirish (katta-kichik harfsiz) | `/maktab?tuman=ilike.%yangi%` | Tumani nomida "yangi" so'zi bor maktablar |
| not.like | Mos bo'lmagan matn | `/maktab?devor_materiali=not.like.%g'isht%` | "g'isht" so'zi yo'q maktablar |
| in | Ro'yxatdan qidirish | `/maktab?viloyat=in.(Toshkent viloyati,Fargona viloyati,Andijon viloyati)` | Shu 3 viloyatdagi maktablar |
| not.in | Ro'yxatdan tashqari | `/maktab?viloyat=not.in.(Jizzax viloyati,Sirdaryo viloyati)` | Jizzax va Sirdaryodan tashqari viloyatlar |
| is.null | Bo'sh (NULL) qiymatlar | `/maktab?devor_materiali=is.null` | Devor materiali ko'rsatilmagan maktablar |
| not.is.null | Bo'sh bo'lmagan qiymatlar | `/maktab?devor_materiali=not.is.null` | Devor materiali bor maktablar |
| gt | Katta (>) | `/maktab?sigim=gt.500` | Sig'imi 500 dan katta maktablar |
| gte | Katta yoki teng (>=) | `/maktab?sigim=gte.500` | Sig'imi ≥ 500 maktablar |
| lt | Kichik (<) | `/maktab?sigim=lt.300` | Sig'imi 300 dan kichik maktablar |
| lte | Kichik yoki teng (<=) | `/maktab?sigim=lte.300` | Sig'imi ≤ 300 maktablar |