'use strict';

/**
 * Масштабирование сцены.
 *
 * Страница свёрстана под фиксированный макет 1680px и ужимается под экран через
 * transform: scale() — так же, как в исходном проекте. Ниже MOBILE_BP зум
 * выключается и работает обычная адаптивная вёрстка из CSS.
 */
(function () {

    var DESIGN_W = 1680;   /* ширина макета */
    var MAX_W = 1755;      /* дальше не растягиваем: на широких экранах текст стал бы гигантским */
    var SIDE = 40;         /* минимальные поля по бокам */
    var MOBILE_BP = 780;   /* ниже — мобильная вёрстка без зума */
    var ANCHOR_GAP = 24;   /* воздух между липкой шапкой и началом секции */

    var viewport = document.getElementById('viewport');
    var stage = document.querySelector('.page');
    if (!viewport || !stage) return;

    function fit() {
        var vw = document.documentElement.clientWidth;

        if (vw < MOBILE_BP) {
            stage.style.transform = 'none';
            stage.style.width = '100%';
            stage.style.marginLeft = '0';
            viewport.style.height = 'auto';
        } else {
            stage.style.width = DESIGN_W + 'px';
            var target = Math.min(vw - SIDE * 2, MAX_W);
            var scale = target / DESIGN_W;
            stage.style.transform = 'scale(' + scale + ')';
            stage.style.marginLeft = ((vw - DESIGN_W * scale) / 2) + 'px';
            /* высоту сцены после scale layout не знает — задаём руками,
               иначе под страницей останется пустота или контент обрежется */
            viewport.style.height = (stage.offsetHeight * scale) + 'px';
        }

        var hdr = document.querySelector('.site-hd');
        if (hdr) {
            document.documentElement.style.scrollPaddingTop =
                Math.round(hdr.getBoundingClientRect().height + ANCHOR_GAP) + 'px';
        }
    }

    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
    fit();

})();

/**
 * Переключатель темы. Выбор запоминается в localStorage, значение читается
 * инлайн-скриптом в <head> до отрисовки, чтобы не мигал фон.
 */
(function () {

    var btn = document.querySelector('.hd-theme');
    if (!btn) return;

    btn.addEventListener('click', function () {
        var dark = document.documentElement.getAttribute('data-theme') !== 'light';
        var next = dark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('aidentiq_theme', next); } catch (e) {}
    });

})();

/**
 * Окно с результатом отправки.
 */
var messageModal = (function () {

    var el = document.getElementById('messageModal');
    if (!el) return { show: function () {} };

    var titleEl = el.querySelector('.mm-title');
    var textEl = el.querySelector('.mm-text');

    function hide() { el.classList.remove('active'); }

    el.querySelector('.close').addEventListener('click', hide);
    el.addEventListener('click', function (e) { if (e.target === el) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });

    return {
        show: function (type, title, text) {
            el.classList.remove('is-error', 'is-success');
            el.classList.add(type === 'error' ? 'is-error' : 'is-success');
            titleEl.textContent = title;
            textEl.textContent = text;
            el.classList.add('active');
        }
    };

})();

/**
 * Отправка форм на php/send.php.
 *
 * Формы помечены novalidate, поэтому нативные пузыри браузера не всплывают:
 * проверяем сами и подсвечиваем поле классом is-invalid — иначе внутри
 * масштабированной сцены подсказка браузера встаёт мимо поля.
 */
(function () {

    document.querySelectorAll('.contact-form').forEach(function (formEl) {

        formEl.addEventListener('input', function (e) {
            if (e.target.classList) e.target.classList.remove('is-invalid');
            var lbl = e.target.closest('.echeck');
            if (lbl) lbl.classList.remove('is-invalid');
        });

        formEl.addEventListener('submit', async function (e) {

            e.preventDefault();

            var invalid = null;
            formEl.querySelectorAll('input').forEach(function (input) {
                if (input.checkValidity()) return;
                if (!invalid) invalid = input;
                var lbl = input.closest('.echeck');
                (lbl || input).classList.add('is-invalid');
            });
            if (invalid) {
                invalid.focus({ preventScroll: false });
                return;
            }

            var submitEl = formEl.querySelector('[type="submit"]');
            if (submitEl) submitEl.disabled = true;

            try {

                var formData = new FormData(formEl);
                formData.append('url', window.location.href);

                var response = await fetch('php/send.php', { method: 'POST', body: formData });
                var responseJson = await response.json();

                if (responseJson.status !== 'success') {
                    throw new Error('Unsuccessful response status');
                }

                formEl.reset();
                messageModal.show(
                    'success',
                    'Thank you!',
                    'We have received your request and will get back to you shortly.'
                );

            } catch (err) {

                messageModal.show(
                    'error',
                    'Something went wrong',
                    'We could not send your request. Please try again or write to hello@aidentiq.com.'
                );

            }

            if (submitEl) submitEl.disabled = false;
        });

    });

})();
