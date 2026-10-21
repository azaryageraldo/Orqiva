<?php

use Pdo\Mysql;

$mysqlSslCa = null;

if (class_exists(Mysql::class)) {
    $mysqlSslCa = Mysql::ATTR_SSL_CA;
} elseif (defined('PDO::MYSQL_ATTR_SSL_CA')) {
    $mysqlSslCa = constant('PDO::MYSQL_ATTR_SSL_CA');
}

$dataDir = getenv('ORQIVA_DATA_DIR') ?: env('ORQIVA_DATA_DIR');
$sqliteDatabase = env('DB_DATABASE');

if (! is_string($sqliteDatabase) || $sqliteDatabase === '' || $sqliteDatabase === 'orqiva') {
    $sqliteDatabase = is_string($dataDir) && $dataDir !== ''
        ? rtrim($dataDir, '/\\').DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'orqiva.sqlite'
        : database_path('database.sqlite');
}

return [
    'default' => env('DB_CONNECTION', 'sqlite'),
    'connections' => [
        'sqlite' => [
            'driver' => 'sqlite',
            'url' => env('DB_URL'),
            'database' => $sqliteDatabase,
            'prefix' => '',
            'prefix_indexes' => null,
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
            'busy_timeout' => 5000,
            'journal_mode' => 'WAL',
            'synchronous' => 'NORMAL',
        ],
        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'orqiva'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => extension_loaded('pdo_mysql') && $mysqlSslCa !== null ? array_filter([
                $mysqlSslCa => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],
    ],
    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],
    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),
        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', 'orqiva-database-'),
        ],
    ],
];
