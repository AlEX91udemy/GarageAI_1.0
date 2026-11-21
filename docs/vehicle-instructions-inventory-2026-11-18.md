# Инвентарь автомобильных инструкций

Проверено 18.11.2026. В таблице отдельно указаны зарегистрированные точки входа, реально скачанные документы и материалы, разрешённые для рекомендаций.

## Локально скачано

| Материал | Издатель | Охват | Статус |
| --- | --- | --- | --- |
| data/manuals/nissan-x-trail-thailand-owner-manual-en.pdf | Nissan Motor (Thailand) | X-Trail T32-A, редакция 2014, рынок TH, MR20DD/CVT | Скачан локально; SHA-256 00936a546890987087bcd85b6c66ef4217f6fda2ab88ef1c849099989d6513b9. Проверены выдержки со страниц 8-10 и 9-3. Применим только к точной конфигурации T32-A/TH/2014/MR20DD/CVT; не соответствует X-Trail T31 2008. |

## Зарегистрированные источники

| ID | Издатель / источник | Тип | Фактический статус |
| --- | --- | --- | --- |
| source-nhtsa-owner | NHTSA | safety database | Страница зарегистрирована; содержимое локально не загружено. |
| source-nhtsa-recalls | NHTSA | safety database | Страница зарегистрирована; VIN-проверка зависит от рынка. |
| source-euro-ncap | Euro NCAP | technical database | Справочная база, не сервисное руководство. |
| source-unece | UNECE WP.29 | official specification | Нормативный контекст, не руководство конкретного автомобиля. |
| source-toyota-manuals | Toyota | official manual | Официальный селектор руководств; конкретный PDF не загружен. |
| source-nissan-manuals | Nissan | official manual | Официальный селектор руководств; T31 2008 нужного рынка не найден. |
| source-nissan-xtrail-thailand-t32 | Nissan Motor (Thailand) | official manual | PDF скачан и проверен для ограниченной конфигурации T32-A/TH/2014/MR20DD/CVT; не применим к T31 2008. |
| source-bmw-manuals | BMW Driver's Guide | official manual | Цифровой селектор по автомобилю; документ не загружен. |
| source-vw-manuals | Volkswagen manual index | technical database | Сторонний индекс; не авторитетный источник заводского интервала. |
| source-kia-manuals | Kia | official manual | Официальный селектор; конкретный PDF не загружен. |
| source-hyundai-manuals | Hyundai | official manual | Официальный селектор; текущий URL требует актуализации. |
| source-mazda-manuals | Mazda | official manual | Каталог PDF; конкретная модель и год не выбраны. |
| source-renault-manuals | Renault | official manual | Точка входа производителя; документ нужной конфигурации не загружен и URL требует проверки. |
| source-chery-manuals | Chery | official manual | Точка входа владельцев; документ нужной конфигурации не загружен и URL требует проверки. |
| source-haval-manuals | Haval | official manual | Точка входа владельцев; документ нужной конфигурации не загружен и URL требует проверки. |
| source-subaru-manuals | Subaru of America | official manual | Официальная страница Vehicle Resources доступна; конкретный документ не загружен, рынок US. |
| source-chevrolet-manuals | Chevrolet | official manual | Официальная страница Manuals and Guides доступна; конкретный документ не загружен, рынок US. |
| source-cadillac-manuals | Cadillac | official manual | Официальная страница Manuals and Guides доступна; конкретный документ не загружен, рынок US. |
| source-audi-manuals | Audi | official manual | Официальный портал Owner's Manuals доступен; конкретный документ не выбран. |
| source-porsche-manuals | Porsche | official manual | Официальный портал Driver's Manuals доступен; конкретный документ не выбран. |
| source-isuzu-manuals | Isuzu UK | official manual | Официальная страница руководств доступна; покрытие ограничено рынком UK, конкретный документ не выбран. |
| source-honda-manuals | Honda | official manual | Официальный селектор; конкретный PDF не загружен. |
| source-mercedes-manuals | Mercedes-Benz | official manual | Цифровой селектор; конкретный документ не загружен. |
| source-avtovaz-manuals | АвтоВАЗ / LADA | official manual | Точка входа; статус сети network_unverified, PDF не загружен. |
| source-uaz-manuals | УАЗ | official manual | Текущий URL вернул 404, PDF не загружен. |
| source-gaz-service | ГАЗ | dealer material | Официальная сервисная точка входа; проверка TLS не завершилась, PDF не загружен. |
| source-moskvich-owners | Москвич | official manual | Страница доступна, конкретное руководство не загружено. |
| source-sollers-owners | Sollers | official manual | Текущий URL вернул 404, PDF не загружен. |
| source-acea-maintenance | ACEA | technical database | Отраслевой справочный источник, не источник заводского регламента. |

## Что разрешено выдавать пользователю

data/knowledge_chunks.json содержит два проверенных фрагмента для Nissan X-Trail T32-A, рынок Таиланд, 2014, двигатель MR20DD, CVT. Для остальных конфигураций точных рекомендаций из руководства нет; общие safety и maintenance правила остаются доступны с низкой или средней уверенностью и явно помечаются как общие.

Чтобы добавить рекомендацию для новой конфигурации, нужен документ с подтверждёнными издателем рынком, годом, поколением, двигателем и КПП. В JSON добавляется только короткая выдержка с заголовком, страницей/разделом, HTTPS URL, SHA-256 и датой проверки. Целый PDF в Git не добавляется.

Для Nissan X-Trail T31 2008 официальная инструкция нужного рынка и силовой установки пока не подтверждена. Сторонние копии Scribd, агрегаторов и платных сервис-мануалов в базу не включались.
