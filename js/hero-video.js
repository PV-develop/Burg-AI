'use strict';

/**
 * Скраб видео в hero — подключается на index.html (первый экран — видеосцена).
 *
 * Секция .vhero тянется на несколько экранов и прилипает sticky-сценой:
 * пока она прилипла, прогресс прокрутки 0..1 задаёт currentTime видео —
 * от «человек стоит» до «разбил лёд». Воспроизведение не запускаем,
 * кадром управляет только скролл.
 *
 * Заодно ведёт шапку: пока под ней ещё кадр видео, вешаем .hd-clear —
 * фон шапки становится прозрачным, текст светлым (сцена тёмная в обеих темах).
 */
(function () {

    var section = document.querySelector('.vhero');
    var video = document.querySelector('.vhero-video');
    if (!section || !video) return;

    var hint = section.querySelector('.vhero-hint');
    var copy = section.querySelector('.vhero-copy');
    var header = document.querySelector('.site-hd');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* сами ведём воспроизведение: гасим автоплей и ставим на первый кадр */
    video.pause();
    try { video.currentTime = 0; } catch (e) {}

    var HINT_PAST = 0.04;   /* доля видеофазы, после которой подсказка «Scroll» гаснет */
    var COPY_END = 0.32;    /* к этой доле заголовок уже улетел вглубь и растворился */
    var COPY_DEPTH = 640;   /* насколько «в пикселях» уходит текст от камеры */
    var SEEK_EPS = 0.03;    /* порог для установки currentTime: каждое присваивание
                               заставляет декодер искать кадр, лишних ищенок избегаем */
    var videoProgress = 0;  /* скролл видеофазы 0..1, дальше видео на последнем кадре */

    function clamp(v) { return Math.max(0, Math.min(1, v)); }

    function measure() {
        var rect = section.getBoundingClientRect();
        var runway = section.offsetHeight - window.innerHeight;
        /* линейный сценарий из двух фаз одного прилипшего экрана:
           1) видеофаза (runway минус один экран) — скролл ведёт кадр
              от «стоит» до «разбил лёд»;
           2) фаза формы — ровно один экран: сцена прилипла, видео стоит
              на последнем кадре, по центру всплывает форма; когда секция
              отлипает, форма уходит вместе с ней и начинается обычный скролл */
        var videoRunway = Math.max(runway - window.innerHeight, 1);
        videoProgress = clamp(-rect.top / videoRunway);
        section.classList.toggle('is-past', videoProgress > HINT_PAST);
        section.classList.toggle('form-show', videoProgress >= 1);

        /* заголовок улетает от камеры и растворяется в начале видеофазы */
        if (copy) {
            var k = clamp(videoProgress / COPY_END);
            copy.style.opacity = (1 - k).toFixed(3);
            copy.style.transform = 'perspective(900px) translateZ(' + (-COPY_DEPTH * k).toFixed(1) + 'px)';
            copy.style.visibility = k >= 1 ? 'hidden' : 'visible';
        }

        /* шапка прозрачна, пока видео ещё заходит под неё; когда снизу
           подступает следующий блок — возвращаем обычный фон */
        if (header) header.classList.toggle('hd-clear', rect.bottom > header.offsetHeight);
    }

    function apply() {
        if (reduceMotion) return;
        if (!video.duration || video.readyState < 2) return; /* метаданные ещё не пришли */
        /* кадр ведёт только видеофаза: в фазе формы видео остаётся на последнем кадре */
        var t = videoProgress * (video.duration - 0.05);
        if (Math.abs(video.currentTime - t) > SEEK_EPS) video.currentTime = t;
    }

    /* без rAF-посредника: measure() дёшев (один getBoundingClientRect и два
       класса), а отложенный кадр мог бы не наступить в скрытой вкладке и
       навсегда заблокировать обработку флагом ticking */
    function onScroll() {
        measure();
        apply();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    if (reduceMotion) {
        /* анимацию не ведём: CSS схлопнул секцию в один экран, видео стоит
           на первом кадре. Шапку при этом всё равно ведём — она наезжает на видео */
        measure();
    } else {
        /* видео могло не успеть загрузиться к первому скроллу — досчитываем,
           когда метаданные придут; poster нет, до загрузки виден фон сцены */
        video.addEventListener('loadedmetadata', apply);
        onScroll();
    }

})();
