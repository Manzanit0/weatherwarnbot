# WeatherWarnBot

[![CI](https://github.com/Manzanit0/weatherwarnbot/actions/workflows/ci.yml/badge.svg)](https://github.com/Manzanit0/weatherwarnbot/actions/workflows/ci.yml)

Tis basically a bot in Telegram for myself to check the weather. Work in Progress.

<a href="https://t.me/WeatherWarnBot"><img src="https://www.umrohterbaik.com/wp-content/uploads/2018/07/telegram-button-1.png" width="130" height="40"></a>

## Getting started

1. `make bootstrap`
2. `make run`

*Note: To remove the database volume run `make bootstrap-down`.*

## 🚀 Deploying

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2FManzanit0%2Fweatherwarnbot%2Ftree%2Fmaster&plugins=postgresql&envs=OPENWEATHERMAP_API_KEY&OPENWEATHERMAP_API_KEYDesc=API+key+provided+by+https%3A%2F%2Fopenweathermap.org)

### Running the migrations

Regarding the migrations, I leverage flyway and running them manually before
deploying due to its simplicity, but since they are raw SQL, you can use a dozen
other different tools. Regarding flyway, you can see how it's leveraged both in
the [docker-compose.yml](./docker-compose.yml) file and in the `rw-migrate` make
target.