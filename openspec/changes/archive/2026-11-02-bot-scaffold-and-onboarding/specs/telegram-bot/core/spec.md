# Spec Delta

## Purpose

Предоставляет базовый рантайм Telegram-бота Zeta, включая конфигурацию через переменные окружения, цикл long polling с корректной остановкой и асинхронный HTTP-клиент к бэкенду.

## ADDED Requirements

### Requirement: Bot Configuration
Бот SHALL загружать и валидировать параметры конфигурации из переменных окружения или `.env` файла.

#### Scenario: Valid configuration load
- **WHEN** заданы обязательные переменные BOT_TOKEN и BACKEND_BASE_URL
- **THEN** сервис успешно инициализирует настройки со значениями по умолчанию для опциональных параметров

#### Scenario: Missing required token
- **WHEN** переменная BOT_TOKEN отсутствует или пуста
- **THEN** сервис прерывает инициализацию с понятной ошибкой конфигурации

### Requirement: Long Polling Lifecycle
Бот SHALL запускаться в режиме long polling и поддерживать graceful shutdown при получении сигналов SIGINT или SIGTERM.

#### Scenario: Graceful shutdown
- **WHEN** процесс получает сигнал SIGINT или SIGTERM
- **THEN** бот корректно останавливает опрос обновлений, закрывает сессии HTTP-клиента и завершает работу с нулевым кодом

#### Scenario: Network error retry
- **WHEN** во время опроса Telegram Bot API возникает временная сетевая ошибка
- **THEN** бот логирует предупреждение и повторяет запрос без аварийного завершения процесса

### Requirement: Backend API Client
Бот SHALL использовать асинхронный HTTP-клиент для взаимодействия с REST API бэкенда Zeta.

#### Scenario: Client request with configured base URL
- **WHEN** бот обращается к эндпоинту бэкенда через BackendClient
- **THEN** запрос отправляется на настроенный BACKEND_BASE_URL с заданным таймаутом

#### Scenario: Backend unavailable handling
- **WHEN** бэкенд недоступен или возвращает ошибку соединения
- **THEN** BackendClient перехватывает исключение, логирует ошибку и выбрасывает контролируемое сервисное исключение
