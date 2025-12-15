# Safe Watcher

This repository contains a bot that monitors one or more Safe addresses for critical activities throughout the entire transaction lifecycle:

- **Adding Transactions:** Detects when new transactions are created in the Safe.
- **Signing Transactions:** Monitors who signs the transactions and how many signatures have been collected.
- **Executing Transactions:** Sends alerts when a transaction is executed.

Additionally, the bot watches for any suspicious `delegateCall`. If a `delegateCall` is directed to an address other than the trusted `MultiSend` contract, the bot immediately flags it, helping to prevent attacks similar to the Bybit hack.

Real-time alerts are sent to a configured Telegram channel for immediate notification.

## Usage

To get started, create a `config.yaml` file with your settings. Refer to [config.example.yaml](config.example.yaml) and [schema.ts](src/config/schema.ts) for guidance.

Run the Docker container with your config file mounted:

```bash
docker run -v $(pwd)/config.yaml:/app/config.yaml ghcr.io/gearbox-protocol/safe-watcher:latest
```

## Configuration

1. Create a `config.yaml` file in your local directory. You can look at [config.example.yaml](config.example.yaml) and [schema.ts](src/config/schema.ts) for details. Here is an example structure:

   ```yaml
   telegramBotToken: "xxxx"
   telegramChannelId: "-1111"
   safeAddresses:
     - "eth:0x11111"
   signers:
     "0x22222": "alice"
     "0x33333": "bob"
   ```

   - **telegramBotToken:** Your Telegram Bot API token (instructions below).
   - **telegramChannelId:** The ID of the channel or group where alerts will be posted.
   - **safeAddresses:** One or more Safe addresses to monitor, prefixed by the network identifier (e.g., `eth:` for the Ethereum mainnet).
   - **signers:** A mapping of addresses to descriptive names (useful for labeling owners in alerts).

2. Ensure that `config.yaml` is in the same directory where you plan to run the Docker container.

### Getting a Telegram Bot Token

1. Open the Telegram app and start a chat with `@BotFather`.
2. Type `/start` if you haven't used BotFather before.
3. Send the command `/newbot` and follow the prompts:
   - Provide a name for your bot (display name).
   - Provide a username for your bot (it must end in "bot", e.g., `MySafeNotifierBot`).
4. Once the bot is created, BotFather will provide you with an HTTP API token (e.g., `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).
5. Copy this token and use it as the value for `telegramBotToken` in your `config.yaml`.

### Getting a Telegram Channel ID

1. Create a new channel or group in Telegram.
2. Invite your bot to the channel.
3. Send a message to the channel.
4. Use getUpdates (Testing Locally or Anywhere You Can Send HTTP Requests)

- Make a call to the [getUpdates](https://core.telegram.org/bots/api#getupdates) endpoint of the Bot API using your bot token. For example: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

The response is a JSON that contains “messages,” “channel_posts,” “callback_query,” or similar objects, depending on how your bot receives interactions.

5. Parse the JSON

- Look for the `"chat"` object inside each message (e.g., `"message"` or `"edited_message"`).
- The `"chat": { "id": ... }` field is the chat ID. For example, a response might look like:

```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 12,
        "from": {
          ...
        },
        "chat": {
          "id": 987654321,
          "first_name": "John",
          "type": "private"
        },
        "date": 1643212345,
        "text": "Hello"
      }
    }
  ]
}
```

In this snippet, 987654321 is the telegramChannelId.
.

### Running via Docker

Run the Docker container with your config file mounted using the following command:

```bash
docker run -v $(pwd)/config.yaml:/app/config.yaml ghcr.io/gearbox-protocol/safe-watcher:latest
```

The bot will start and immediately begin monitoring the specified Safe addresses. Any relevant changes or suspicious `delegateCall` attempts will be sent to your Telegram channel.

## License

This project is distributed under the MIT License.

## Disclaimer

This software is provided "as is," without warranties or guarantees of any kind. Use it at your own risk. The maintainers and contributors are not liable for any damages or losses arising from its use. Always exercise caution and follow best security practices when managing crypto assets.


### Important information for contributors
As a contributor to the Gearbox Protocol GitHub repository, your pull requests indicate acceptance of our Gearbox Contribution Agreement. This agreement outlines that you assign the Intellectual Property Rights of your contributions to the Gearbox Foundation. This helps safeguard the Gearbox protocol and ensure the accumulation of its intellectual property. Contributions become part of the repository and may be used for various purposes, including commercial. As recognition for your expertise and work, you receive the opportunity to participate in the protocol's development and the potential to see your work integrated within it. The full Gearbox Contribution Agreement is accessible within the [repository](/ContributionAgreement) for comprehensive understanding. [Let's innovate together!]

