require("dotenv").config({
    allowEmptyValues: true,
    path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

const puppeteer = require("puppeteer");
const fs = require("fs");
const { connectionDb } = require("../db");
const { FII } = require("../schema");
const urlBase = "https://www.fundsexplorer.com.br/funds";
const options = {
    executablePath: process.env.SYSTEM_OPERATION === 'macos' ? process.env.CHROME_PATH_MACOS : process.env.CHROME_PATH_WINDOWS,
    headless: true,
    defaultViewport: null,
    args: ["--window-size=1920,1080"],
};
const optionsDate = {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "America/Sao_Paulo",
};

startJob()

async function startJob() {

    const dateStart = Intl.DateTimeFormat("pt-br", optionsDate).format(new Date());
    console.log(`Iniciado em: ${dateStart}`);

    // CONECTA NO BANCO
    await connectionDb();

    if (process.env.GERA_HTML_DB === 'true') {
        await geraHtmlDb()
        return
    }

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(urlBase);
    await sleep(100);

    const divs = await page.$$("#fiis-list-container > div", (divs) => divs);
    let fiis = [];

    for (let i = 0; i < divs.length; i++) {
        const div = divs[i];

        const value = await page.evaluate((el) => el.textContent, div);

        let valueArr = value.split("\n");
        valueArr = getNewArr(valueArr);

        console.log(valueArr[0]);

        try {
            let {
                price,
                percentage,
                liquidez,
                ultimorendimento,
                rendimentodividendo,
                patrimonioliquido,
                valorpatrimonial,
                rentabilidademes,
                pvp,
            } = await info(browser, urlBase, valueArr[0]);

            const row = {
                name: valueArr[0],
                desc: valueArr[1],
                admin: valueArr[3],
                price: price ? price.trim().replace(" ", "") : "n/a",
                percentage: percentage ? percentage.trim() : "n/a",
                liquidez: liquidez ? liquidez.trim() : "n/a",
                ultimorendimento: ultimorendimento
                    ? ultimorendimento.trim().replace(" ", "")
                    : "n/a",
                rendimentodividendo: rendimentodividendo
                    ? rendimentodividendo.trim()
                    : "n/a",
                patrimonioliquido: patrimonioliquido
                    ? patrimonioliquido.trim().replace(" ", "")
                    : "n/a",
                valorpatrimonial: valorpatrimonial
                    ? valorpatrimonial.trim().replace(" ", "")
                    : "n/a",
                rentabilidademes: rentabilidademes ? rentabilidademes.trim() : "n/a",
                pvp: pvp.trim(),
            };

            fiis.push(row);

            let query = { name: row.name },
                update = { ...row },
                options = { upsert: true };

            // grava os dados no MongoDb
            try {
                await FII.findOneAndUpdate(query, update, options);
            } catch (error) {
                console.log(`updateFII/Db->${error.stack}`);
            }
        } catch (error) {
            console.log(error.message);
        }

        await sleep(50);
    }

    let bodyHtml = geraHtml(fiis);
    let opt = {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    };

    dataAtual = Intl.DateTimeFormat("pt-br", opt)
        .format(new Date())
        .replace("/", "")
        .replace("/", "")
        .replace(",", "")
        .replace(" ", "-")
        .replace(":", "")
        .replace(":", "");


    const dirReport = `${process.cwd()}/src/reports/`

    if (!fs.existsSync(dirReport)) {
        fs.mkdirSync(dirReport);
    }
    let file = `${dirReport}${dataAtual}.html`;

    await fs.writeFileSync(file, bodyHtml);

    const dateFinish = Intl.DateTimeFormat("pt-br", optionsDate).format(
        new Date()
    );
    console.log(`Finalizado em: ${dateFinish}`);

}

async function geraHtmlDb() {

    const fiis = await FII.find({})

    let bodyHtml = geraHtml(fiis);
    let opt = {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    };

    dataAtual = Intl.DateTimeFormat("pt-br", opt)
        .format(new Date())
        .replace("/", "")
        .replace("/", "")
        .replace(",", "")
        .replace(" ", "-")
        .replace(":", "")
        .replace(":", "");


    const dirReport = `${process.cwd()}/src/reports/`

    if (!fs.existsSync(dirReport)) {
        fs.mkdirSync(dirReport);
    }
    let file = `${dirReport}${dataAtual}.html`;

    await fs.writeFileSync(file, bodyHtml);

    const dateFinish = Intl.DateTimeFormat("pt-br", optionsDate).format(
        new Date()
    );

    console.log(`Finalizado em: ${dateFinish}`);

}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNewArr(arr) {
    let newArr = [];
    arr.forEach((el) => {
        if (el.trim().length > 0) {
            newArr.push(el.trim());
        }
    });
    return newArr;
}

async function info(browser, urlBase, fii) {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(`${urlBase}/${fii.toLowerCase()}`);
    // await sleep(1000);

    let priceSelector = await page.$("#stock-price > span.price");
    let price = priceSelector
        ? await page.evaluate((el) => el.textContent, priceSelector)
        : null;

    let percentageSelector = await page.$(
        "#stock-price > span.percentage.positive"
    );

    if (!percentageSelector) {
        percentageSelector = await page.$(
            "#stock-price > span.percentage.negative"
        );
    }

    let percentage = percentageSelector
        ? await page.evaluate((el) => el.textContent, percentageSelector)
        : null;

    let liquidezSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(1) > span.indicator-value"
    );
    let liquidez = liquidezSelector
        ? await page.evaluate((el) => el.textContent, liquidezSelector)
        : null;

    let ultimoRendimentoSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(2) > span.indicator-value"
    );
    let ultimorendimento = ultimoRendimentoSelector
        ? await page.evaluate((el) => el.textContent, ultimoRendimentoSelector)
        : null;

    let rendimentoDividendoSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(3) > span.indicator-value"
    );
    let rendimentodividendo = rendimentoDividendoSelector
        ? await page.evaluate((el) => el.textContent, rendimentoDividendoSelector)
        : null;

    let patrimonioLiquidoSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(4) > span.indicator-value"
    );
    let patrimonioliquido = patrimonioLiquidoSelector
        ? await page.evaluate((el) => el.textContent, patrimonioLiquidoSelector)
        : null;

    let valorPatrimonialSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(5) > span.indicator-value"
    );
    let valorpatrimonial = valorPatrimonialSelector
        ? await page.evaluate((el) => el.textContent, valorPatrimonialSelector)
        : null;

    let rentabilidadeMesSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(6) > span.indicator-value"
    );
    let rentabilidademes = rentabilidadeMesSelector
        ? await page.evaluate((el) => el.textContent, rentabilidadeMesSelector)
        : null;

    let pvpSelector = await page.$(
        "#main-indicators-carousel > div > div > div:nth-child(7) > span.indicator-value"
    );

    let pvp = pvpSelector
        ? await page.evaluate((el) => el.textContent, pvpSelector)
        : null;

    page.close();

    return {
        price,
        percentage,
        liquidez,
        ultimorendimento,
        rendimentodividendo,
        patrimonioliquido,
        valorpatrimonial,
        rentabilidademes,
        pvp,
    };
}

function geraHtml(fiis) {
    let body = `<!DOCTYPE html>
<html>

<head>
    <link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@mdi/font@6.x/css/materialdesignicons.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/vuetify@2.x/dist/vuetify.min.css" rel="stylesheet">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui">
</head>

<body>
    <div id="app">
        <v-app>
            <v-main>
                <template>
                    <v-card>
                        <v-data-table fixed-header height="600" :headers="showHeaders" :items="itemRows"
                            :items-per-page="5" class="elevation-1" item-key="name" :search="search">

                            <template v-slot:top>

                                <v-toolbar flat>

                                    <v-toolbar-title>Fundos Imobiliários</v-toolbar-title>

                                    <v-divider class="mx-4" inset vertical></v-divider>

                                    <v-combobox v-model="selectedFiis" :items="desserts.map(el => el.name)" label="Nome" multiple solo dense
                                        chips class="mt-7 pa-2" label="Selecione">
                                        <template v-slot:selection="data">
                                            <v-chip :key="JSON.stringify(data.item)" v-bind="data.attrs"
                                                :input-value="data.selected" :disabled="data.disabled" close
                                                @click:close="data.parent.selectItem(data.item)">
                                                <v-avatar class="accent white--text" left
                                                    v-text="data.item.slice(0, 1).toUpperCase()"></v-avatar>
                                                {{ data.item }}
                                            </v-chip>
                                        </template>
                                    </v-combobox>

                                    <v-spacer></v-spacer>

                                    <v-select v-model="selectedHeaders" :items="headers" label="Colunas" multiple solo dense
                                        return-object class="mt-7 pa-2">
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2">
                                                <span>{{ item.text }}</span>
                                            </v-chip>
                                            <span v-if="index === 2" class="grey--text caption">(+{{
                                                selectedHeaders.length - 2 }} others)</span>
                                        </template>
                                    </v-select>

                                </v-toolbar>

                            </template>

                            <template v-slot:header.name="{ header }"> 
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="name" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.desc="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="desc" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.admin="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="admin" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.price="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="price" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.percentage="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="percentage" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.liquidez="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="liquidez" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.ultimorendimento="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="ultimorendimento" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.rendimentodividendo="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="rendimentodividendo" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.patrimonioliquido="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="patrimonioliquido" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.valorpatrimonial="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="valorpatrimonial" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.rentabilidademes="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="rentabilidademes" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:header.pvp="{ header }">
                                {{ header.text }}
                                <v-menu 
                                    :nudge-width="200"
                                    offset-x>
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-btn icon v-bind="attrs" v-on="on">
                                            <v-icon small color="primary">
                                                mdi-filter-variant
                                            </v-icon>
                                        </v-btn>
                                    </template>
                                    <div style="background-color: white; width: 280px">
                                        <v-text-field 
                                            v-model="pvp" 
                                            class="pa-4" 
                                            label="Pesquisar por"
                                            :autofocus="true">
                                        </v-text-field>
                                        <v-btn 
                                            @click="filterByColumn(false, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Cancelar
                                        </v-btn>
                                        <v-btn 
                                            @click="filterByColumn(true, header.value)" 
                                            small 
                                            text 
                                            color="primary"
                                            class="ml-2 mb-2">Ok
                                        </v-btn>
                                    </div>
                                </v-menu>
                            </template>

                            <template v-slot:item.name="{ item }">
                                <div class="font-weight-light">{{ item.name }}</div>
                            </template>

                            <template v-slot:item.desc="{ item }">
                                <div class="font-weight-light">{{ item.desc }}</div>
                            </template>

                            <template v-slot:item.admin="{ item }">
                                <div class="font-weight-light">{{ item.admin }}</div>
                            </template>

                            <template v-slot:item.price="{ item }">
                                <div class="font-weight-light">{{ item.price }}</div>
                            </template>

                            <template v-slot:item.liquidez="{ item }">
                                <div class="font-weight-light">{{ item.liquidez }}</div>
                            </template>

                            <template v-slot:item.ultimorendimento="{ item }">
                                <div class="font-weight-light">{{ item.ultimorendimento }}</div>
                            </template>

                            <template v-slot:item.patrimonioliquido="{ item }">
                                <div class="font-weight-light">{{ item.patrimonioliquido }}</div>
                            </template>

                            <template v-slot:item.valorpatrimonial="{ item }">
                                <div class="font-weight-light">{{ item.valorpatrimonial }}</div>
                            </template>

                            <template v-slot:item.pvp="{ item }">
                                <div class="font-weight-light">{{ item.pvp }}</div>
                            </template>

                            <template v-slot:item.percentage="{ item }">
                                <v-chip :color="getColor(item.percentage)" dark label small>
                                    <v-avatar left>
                                        <v-icon>{{ iconPercentual }}</v-icon>
                                    </v-avatar>
                                    <div class="font-weight-black">{{ item.percentage }}</div>
                                </v-chip>
                            </template>

                            <template v-slot:item.rendimentodividendo="{ item }">
                                <v-chip :color="getColor(item.rendimentodividendo)" dark label small>
                                    <v-avatar left>
                                        <v-icon>{{ iconPercentual }}</v-icon>
                                    </v-avatar>
                                    <div class="font-weight-black">{{ item.rendimentodividendo }}</div>
                                </v-chip>
                            </template>

                            <template v-slot:item.rentabilidademes="{ item }">
                                <v-chip :color="getColor(item.rentabilidademes)" dark label small>
                                    <v-avatar left>
                                        <v-icon>{{ iconPercentual }}</v-icon>
                                    </v-avatar>
                                    <div class="font-weight-black">{{ item.rentabilidademes }}</div>
                                </v-chip>
                            </template>

                        </v-data-table>
                    </v-card>
                </template>            
            </v-main>            
        </v-app>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vuetify@2.x/dist/vuetify.js"></script>
    <script src="https://unpkg.com/vuex@4.0.0/dist/vuex.global.js"></script>
    <script>
        new Vue({
            el: "#app",
            vuetify: new Vuetify({
                theme: {
                    defaultTheme: 'myCustomTheme',
                    themes: {
                        myCustomTheme: {
                            dark: false,
                            colors: {
                                background: '#FFFFFF',
                                surface: '#FFFFFF',
                                primary: '#6200EE',
                                'primary-darken-1': '#3700B3',
                                secondary: '#03DAC6',
                                'secondary-darken-1': '#018786',
                                error: '#B00020',
                                info: '#2196F3',
                                success: '#4CAF50',
                                warning: '#FB8C00',
                            }
                        }
                    }
                }
            }),
            data() {
                return {
                    name: '',
                    desc: '',
                    admin: '',
                    price: '',
                    percentage: '',
                    liquidez: '',
                    ultimorendimento: '',
                    rendimentodividendo: '',
                    patrimonioliquido: '',
                    valorpatrimonial: '',
                    rentabilidademes: '',
                    pvp: '',
                    search: '',
                    multiSearch: '',
                    headers: [],
                    selectedHeaders: [],
                    selectedFiis: [],
                    itemRows:[],
                    condition: [],
                    headersMap: [
                        { 
                            text: "Nome", 
                            value: "name", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.name.toLowerCase() ) }  
                        },
                        { 
                            text: "Descrição", 
                            value: "desc", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.desc.toLowerCase() ) }  
                        },
                        { 
                            text: "Admin", 
                            value: "admin", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.admin.toLowerCase() ) }
                        },
                        { 
                            text: "Preço", 
                            value: "price", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.price.toLowerCase() ) } 
                        },
                        { 
                            text: "Percentual", 
                            value: "percentage", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.percentage.toLowerCase() ) }
                        },
                        { 
                            text: "Liquidez", 
                            value: "liquidez", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.liquidez.toLowerCase() ) } 
                        },
                        { 
                            text: "Ultimo.Rend"
                            , value: "ultimorendimento", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.ultimorendimento.toLowerCase() ) }  
                        },
                        { 
                            text: "Rend.Dividendo", 
                            value: "rendimentodividendo", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.rendimentodividendo.toLowerCase() ) }   
                        },
                        { 
                            text: "Patr.Liquido"
                            , value: "patrimonioliquido", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light', 
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.patrimonioliquido.toLowerCase() ) }
                        },
                        { 
                            text: "Vlr.Patrimonial", 
                            value: "valorpatrimonial", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.valorpatrimonial.toLowerCase() ) }
                        },
                        { 
                            text: "Rent.Mensal",
                            value: "rentabilidademes", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.rentabilidademes.toLowerCase() ) } 
                        },
                        { 
                            text: "P/VP",
                            value: "pvp", 
                            align: "start", 
                            sortable: false, 
                            class: 'font-weight-light',
                            filter: f => { return ( f + '' ).toLowerCase().includes( this.pvp.toLowerCase() ) }  
                        },

                    ],
                    ###
                }
            },
            created() {
                this.headers = Object.values(this.headersMap);
                this.selectedHeaders = this.headers;
                this.itemRows = this.desserts
            },
            computed: {
                
                showHeaders() {
                    return this.headers.filter(s => this.selectedHeaders.includes(s));
                },

            },
            watch: {
                selectedFiis(items) {

                    if (items.length === 0) {
                        this.itemRows = this.desserts
                    }
                    this.itemRows = this.desserts.filter(s => items.includes(s.name))
                },
                itemRows(newValue){
                    if (newValue.length === 0) {
                        this.itemRows = this.desserts
                    }
                    return this.itemRows
                },
            },
            methods: {
                getColor(percentage) {

                    if (percentage === 'N/A') {
                        this.iconPercentual = 'mdi-block-helper'
                        return 'cyan'
                    }
                    else if (percentage.includes('0,00')) {
                        this.iconPercentual = 'mdi-trending-neutral'
                        return 'secundary'
                    }
                    else if (percentage.includes('-')) {
                        this.iconPercentual = 'mdi-trending-down'
                        return 'red'
                    }
                    else {
                        this.iconPercentual = 'mdi-trending-up'
                        return 'green'
                    }

                },
                filterByColumn(type, col){
                    if (!type) {
                        this[col] = ''
                        this.itemRows = this.desserts
                    }
                }
                
            }
        })
    </script>    
</body>

</html>`;

    body = body.replace("###", `desserts: ${JSON.stringify(fiis)}`);

    return body;
}
