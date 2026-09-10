<?php

/**
 * Приёмник заявок с форм лендинга. Перенесён из проекта Простора, закомментированный
 * блок отправки в их CRM убран, добавлено поле consent — под GDPR факт согласия
 * нужно уметь показать.
 *
 * Сейчас заявки пишутся в send.log рядом с этим файлом. Чтобы они уходили ещё и на
 * почту, задайте адрес в переменной окружения LEAD_EMAIL (SetEnv в .htaccess или
 * настройки хостинга) — адресам и доступам в коде не место.
 */

$response = array('status' => 'unknown');

try {

    $name = isset($_POST['name']) ? $_POST['name'] : null;
    $phone = isset($_POST['phone']) ? $_POST['phone'] : null;
    $email = isset($_POST['email']) ? $_POST['email'] : null;
    $comment = isset($_POST['comment']) ? $_POST['comment'] : null;
    $url = isset($_POST['url']) ? $_POST['url'] : null;
    // метка формы: hero-free-ai-audit / consultation-cta / final-cta — без неё
    // непонятно, какой блок лендинга приносит заявки
    $source = isset($_POST['source']) ? $_POST['source'] : null;
    $consent = isset($_POST['consent']) ? '1' : '0';

    $dt = date('r');
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null;
    $data = compact('name', 'phone', 'email', 'comment', 'url', 'source', 'consent', 'ip');

    // __DIR__, а не относительный путь: иначе лог уедет в текущий каталог процесса
    file_put_contents(
        __DIR__ . '/send.log',
        json_encode(compact('dt', 'data'), JSON_UNESCAPED_UNICODE) . "\n",
        FILE_APPEND
    );

    $to = getenv('LEAD_EMAIL');
    if ($to) {
        $body = "New request from the AIDENTIQ landing page\n\n";
        foreach ($data as $key => $value) {
            $body .= $key . ': ' . $value . "\n";
        }
        $body .= 'date: ' . $dt . "\n";
        // сбой mail() не фатален: заявка уже в логе, терять её из-за почты нельзя
        @mail($to, 'AIDENTIQ - new request', $body, 'Content-Type: text/plain; charset=utf-8');
    }

    $response = array('status' => 'success');

} catch (Throwable $e) {

    $response = array(
        'status' => 'error',
        'message' => $e->getMessage(),
    );

}

header('Content-Type: application/json');
echo json_encode($response);
