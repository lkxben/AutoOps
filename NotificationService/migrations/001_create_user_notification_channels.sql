CREATE TABLE IF NOT EXISTS user_notification_channels (
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    address TEXT NOT NULL,
    PRIMARY KEY (user_id, channel)
);