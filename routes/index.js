const express = require("express");
const router = express.Router();
const fs = require('fs');
const axios = require('axios')



const mysql = require('mysql2')
const moment = require('moment')
'use strict';


var token_value = "empty";


const connection = mysql.createConnection({
    host: 'mysql-chevy.alwaysdata.net',
    user: 'chevy_free',
    password: 'adivinala',
    database: 'chevy_logsdb'
})

connection.connect(
    function (error) {
        if (error) {
            throw error;
        } else {
            console.log("successful connection")
        }
    }
)




function routes(app) {


    router.get('/', async (req, res) => {


        res.send("work!!!");
    });



    async function validoToken() {
        var token_base = await getInfo();
        //console.log("token base ", token_base[0])

        var fechaDeToken = token_base[0].create_date;
        var tokenValido = token_base[0].token;
        var token_id = token_base[0].id;

        var fecha_Actual = moment();

        var hora = fecha_Actual.diff(moment(fechaDeToken), "h");

        console.log("moment hora", hora);

        if (hora < 24) {
            console.log("ok");
            return tokenValido;
        }
        else {
            //generar un nuevo token
            const tokenGenerado = await generateToken();


            const q = `UPDATE logs_tokens SET token="${tokenGenerado}" WHERE id="${token_id}"`
            connection.query(q, function (error, results) {
                if (error) throw error;
                console.log("added", results)
            })

            return await tokenGenerado;
        }
    }


    async function getInfo() {
        var sql = "SELECT * FROM logs_tokens ORDER by ID DESC LIMIT 1"
        const results = await connection.promise().query(sql)
        return results[0]
    }




    async function generateToken() {
        try {

            const result = await axios.post(`https://gestionaleideale.cloud/rest/api/v1/auth`, {
                "client": "dashboard.gestionaleideale",
                "user": "demo-dashboard",
                "api_key": "ff90790787f8572cc1933ac6b5789fdea8411a34ba189e9734f934f7f7a509b7"
            })
            //var token = result.data.token;
            token_value = await result.data.token;

            console.log("token generado", token_value)
            return token_value;



        } catch (error) {

            console.log(error)

            return error;
        }

    }



    router.get('/get-testtoken', async (req, res) => {


        console.log("valor por defecto del token ", token_value)

        const valido = await validoToken();

        res.send(valido);


    });

    router.get('/get-product', async (req, res) => {
        try {

            const tokenValido = await validoToken();

            console.log("tokenValid", tokenValido)

            const resProd = await axios.get(`https://gestionaleideale.cloud/rest/api/v1/demo-easydashboard/products`,
                {
                    headers: {
                        'Authorization': `token: ${tokenValido}`
                    }
                }

            )
            res.send(resProd.data);

            //   res.send(tokenValido)

        } catch (error) {

            console.log(error)

            res.send(error);
        }





    });


  

    router.get('/get-docs-api', async (req, res) => {
        try {

            const tokenValido = await validoToken();

            console.log("token valido ", tokenValido)
            // linea comentada para no generar el token en cada peticions

            //   console.log("valor  del token", token_value)
            const resDocs = await axios.get(`https://gestionaleideale.cloud/rest/api/v1/demo-easydashboard/docs`,
                {
                    headers: {
                        'Authorization': `token: ${tokenValido}`
                    }
                }

            )

            res.send(resDocs.data);

        } catch (error) {

            console.log(error)

            res.send(error);
        }
    });
    router.get('/get-docs-month', async (req, res) => {
        try {

            const tokenValido = await validoToken();

            console.log("token valido ", tokenValido)
            const resDocs = await axios.get(`https://gestionaleideale.cloud/rest/api/v1/demo-easydashboard/docs`,
                {
                    headers: {
                        'Authorization': `token: ${tokenValido}`
                    }
                }

            )



            var arrayDocs = resDocs.data.docs;

            const arrP = [];
            for (var i = 0; i < arrayDocs.length; i++) {
                var par = {
                    x: Number(arrayDocs[i].document_date.substring(5, 7)),
                    total: arrayDocs[i].total,
                    month: Number(arrayDocs[i].document_date.substring(5, 7)),
                    date: new Date(arrayDocs[i].document_date)
                }

                arrP.push(par)
            }
            //ordenar par por fechas
            arrP.sort(function (a, b) {
                return (a.date - b.date)
            })

            var grouplist = []

            var groupformed = []
            //algoritmo
            //paso 1 comparar si la sgiuente fecha es distinto de la fecha actual(comparacion por años)
            //si es distion quiere decir que ya obtube el primer grupo del array
            //paso 2 hacer esto hacer termianar de recorrer todos el array
            var currentDate = arrP[0].date.getFullYear();
            var obj = {
                x: arrP[0].x,
                total: arrP[0].total,
                month: arrP[0].month,
                date: arrP[0].date
            }
            groupformed.push(obj);

            for (var i = 1; i < arrP.length; i++) {
                //   console.log("get time ", arrP[i].date.getTime());

                if (currentDate == arrP[i].date.getFullYear()) {
                    var obj = {
                        x: arrP[i].x,
                        total: arrP[i].total,
                        month: arrP[i].month,
                        date: arrP[i].date
                    }
                    groupformed.push(obj);

                } else {

                    grouplist.push(groupformed)
                    currentDate = arrP[i].date.getFullYear();

                    groupformed = []

                    var obj = {
                        x: arrP[i].x,
                        total: arrP[i].total,
                        month: arrP[i].month,
                        date: arrP[i].date
                    }
                    groupformed.push(obj);
                }

            }

            grouplist.push(groupformed)


            var arrayFormartEnd = [];

            const colors_graphic = [{ state: 0, color: "#148122" },
            { state: 0, color: "orange" },
            { state: 0, color: "red" },
            { state: 0, color: "#00C5C8" },
            { state: 0, color: "#C86700" },
            { state: 0, color: "yellow" }]

            for (var i = 0; i < grouplist.length; i++) {
                arrayFormartEnd.push(getFormarArray(grouplist[i], colors_graphic))
            }


            res.send(arrayFormartEnd)



        } catch (error) {

            console.log(error)

            res.send(error);
        }

    });


    function getFormarArray(arrP, colors_graphic) {


        var averageJanuary = 0; //1
        var averageFebruary = 0; //2
        var averageMarch = 0; //3
        var averageApril = 0;//4
        var averageMay = 0;//5
        var averageJune = 0;//6
        var averageJuly = 0;//7
        var averageAugust = 0;//8
        var averageSeptember = 0;//9
        var averageOctober = 0;//10
        var averageNovember = 0;//11
        var averageDecember = 0;//12

        var contJanuary = 0; //1
        var contFebruary = 0; //2
        var contMarch = 0; //3
        var contApril = 0;//4
        var contMay = 0;//5
        var contJune = 0;//6
        var contJuly = 0;//7
        var contAugust = 0;//8
        var contSeptember = 0;//9
        var contOctober = 0;//10
        var contNovember = 0;//11
        var contDecember = 0;//12

        var id = arrP[0].date.getFullYear().toString();
        //siguente objetivo sacar un promedio de por mes de los datos
        for (var i = 0; i < arrP.length; i++) {
            switch (arrP[i].month) {
                case 1:
                    averageJanuary = averageJanuary + Number(arrP[i].total)
                    contJanuary = contJanuary + 1;
                    break;
                case 2:
                    averageFebruary = averageFebruary + Number(arrP[i].total)
                    contFebruary = contFebruary + 1;
                    break;
                case 3:
                    averageMarch = averageMarch + Number(arrP[i].total)
                    contMarch = contMarch + 1;
                    break;
                case 4:
                    averageApril = averageApril + Number(arrP[i].total)
                    contApril = contApril + 1;
                    break;
                case 5:
                    averageMay = averageMay + Number(arrP[i].total)
                    contMay = contMay + 1;
                    break;
                case 6:
                    averageJune = averageJune + Number(arrP[i].total)
                    contJune = contJune + 1;
                    break;
                case 7:
                    averageJuly = averageJuly + Number(arrP[i].total)
                    contJuly = contJuly + 1;
                    break;
                case 8:
                    averageAugust = averageAugust + Number(arrP[i].total)
                    contAugust = contAugust + 1;
                    break;
                case 9:
                    averageSeptember = averageSeptember + Number(arrP[i].total)
                    contSeptember = contSeptember + 1;
                    break;
                case 10:
                    averageOctober = averageOctober + Number(arrP[i].total)
                    contOctober = contOctober + 1;
                    break;
                case 11:
                    averageNovember = averageNovember + Number(arrP[i].total)
                    contNovember = contNovember + 1;
                    break;
                case 12:
                    averageDecember = averageDecember + Number(arrP[i].total)
                    contDecember = contDecember + 1;
                    break;
                default:

                    break;
            }

        }
        //calcular el promedio

        var newPares = [
            { x: "January", y: validateDivision(averageJanuary, contJanuary) }, //2
            { x: "February", y: validateDivision(averageFebruary, contFebruary) }, //2
            { x: "March", y: validateDivision(averageMarch, contMarch) }, //3
            { x: "April", y: validateDivision(averageApril, contApril) },//4
            { x: "May", y: validateDivision(averageMay, contMay) },//5
            { x: "June", y: validateDivision(averageJune, contJune) },//6
            { x: "July", y: validateDivision(averageJuly, contJuly) },//7
            { x: "August", y: validateDivision(averageAugust, contAugust) },//8
            { x: "September", y: validateDivision(averageSeptember, contSeptember) },//9
            { x: "October", y: validateDivision(averageOctober, contOctober) },//10
            { x: "November", y: validateDivision(averageNovember, contNovember) },//11
            { x: "December", y: validateDivision(averageDecember, contDecember) },//12

        ]
        //   console.log(newPares)

        /*   for (var j = 0; j < newPares.length; j++) {
               if (newPares[j].y == 0) {
                   newPares.splice(j, 1)
               }
           }*/


        //algorithm to add colors
        //1 traverse the array of colors until state is 0
        //if zero, change state to 1
        //2 if the first run no color is available, set all states to 0

        var color_put = "";
        for (var j = 0; j < colors_graphic.length; j++) {
            if (colors_graphic[j].state == 0 && !color_put) {
                color_put = colors_graphic[j].color;
                colors_graphic[j].state = 1;
                //  console.log("color put ", color_put)
            }
        }





        const object_data = {
            id: id,
            color: color_put,
            data: newPares
        }

        return object_data;
    }

    
    function validateDivision(a, b) {
        //(a/b)
        if (b != 0) {
            return a / b;
        } else {
            return 0;
        }
    }

    router.get('/get-docs-trimester', async (req, res) => {
        try {
            const tokenValido = await validoToken();



            const array = await getDocsSalesTrimestrestest(tokenValido);
            res.send(array);
        } catch (error) {

            console.log(error)

            res.send(error);
        }

    });

    const getDocsSales = async () => {


        const resDocs = await axios.get(`https://gestionaleideale.cloud/rest/api/v1/demo-easydashboard/docs`,
            {
                headers: {
                    'Authorization': `token: ${token_value}`
                }
            }

        )

        //objetivo lo que la api devuelva un array de pares X  , Y

        var arrayDocs = resDocs.data.docs;

        const arrP = [];
        for (var i = 0; i < arrayDocs.length; i++) {
            var par = {
                x: Number(arrayDocs[i].document_date.substring(5, 7)),
                total: arrayDocs[i].total,
                month: Number(arrayDocs[i].document_date.substring(5, 7)),
                date: new Date(arrayDocs[i].document_date)
            }

            arrP.push(par)
        }
        //ordenar par por fechas
        arrP.sort(function (a, b) {
            return (a.date - b.date)
        })

        //promedio //averge
        var averageJanuary = 0; //1
        var averageFebruary = 0; //2
        var averageMarch = 0; //3
        var averageApril = 0;//4
        var averageMay = 0;//5
        var averageJune = 0;//6
        var averageJuly = 0;//7
        var averageAugust = 0;//8
        var averageSeptember = 0;//9
        var averageOctober = 0;//10
        var averageNovember = 0;//11
        var averageDecember = 0;//12

        var contJanuary = 0; //1
        var contFebruary = 0; //2
        var contMarch = 0; //3
        var contApril = 0;//4
        var contMay = 0;//5
        var contJune = 0;//6
        var contJuly = 0;//7
        var contAugust = 0;//8
        var contSeptember = 0;//9
        var contOctober = 0;//10
        var contNovember = 0;//11
        var contDecember = 0;//12

        //siguente objetivo sacar un promedio de por mes de los datos
        for (var i = 0; i < arrP.length; i++) {
            switch (arrP[i].month) {
                case 1:
                    averageJanuary = averageJanuary + Number(arrP[i].total)
                    contJanuary = contJanuary + 1;
                    break;
                case 2:
                    averageFebruary = averageFebruary + Number(arrP[i].total)
                    contFebruary = contFebruary + 1;
                    break;
                case 3:
                    averageMarch = averageMarch + Number(arrP[i].total)
                    contMarch = contMarch + 1;
                    break;
                case 4:
                    averageApril = averageApril + Number(arrP[i].total)
                    contApril = contApril + 1;
                    break;
                case 5:
                    averageMay = averageMay + Number(arrP[i].total)
                    contMay = contMay + 1;
                    break;
                case 6:
                    averageJune = averageJune + Number(arrP[i].total)
                    contJune = contJune + 1;
                    break;
                case 7:
                    averageJuly = averageJuly + Number(arrP[i].total)
                    contJuly = contJuly + 1;
                    break;
                case 8:
                    averageAugust = averageAugust + Number(arrP[i].total)
                    contAugust = contAugust + 1;
                    break;
                case 9:
                    averageSeptember = averageSeptember + Number(arrP[i].total)
                    contSeptember = contSeptember + 1;
                    break;
                case 10:
                    averageOctober = averageOctober + Number(arrP[i].total)
                    contOctober = contOctober + 1;
                    break;
                case 11:
                    averageNovember = averageNovember + Number(arrP[i].total)
                    contNovember = contNovember + 1;
                    break;
                case 12:
                    averageDecember = averageDecember + Number(arrP[i].total)
                    contDecember = contDecember + 1;
                    break;
                default:

                    break;
            }

        }
        //calcular el promedio

        var newPares = [
            { x: "January", y: averageJanuary / contJanuary }, //2
            { x: "February", y: averageFebruary / contFebruary }, //2
            { x: "March", y: averageMarch / contMarch }, //3
            { x: "April", y: averageApril / contApril },//4
            { x: "May", y: averageMay / contMay },//5
            { x: "June", y: averageJune / contJune },//6
            { x: "July", y: averageJuly / contJuly },//7
            { x: "August", y: averageAugust / contAugust },//8
            { x: "September", y: averageSeptember / contSeptember },//9
            { x: "October", y: averageOctober / contOctober },//10
            { x: "November", y: averageNovember / contNovember },//11
            { x: "December", y: averageDecember / contDecember },//12

        ]



        const object_data = [{
            id: `sales/month`,
            color: '#C800C8',
            data: newPares
        }
        ]
        //  console.log("object data api express",object_data)

        return object_data;
    }

    const getDocsSalesmonth = async (t) => {
    }
    const getDocsSalesTrimestres = async (t) => {


        // var token = 'a2f62905aa177edfc2e002fbf7a9f9e385899ec522cee3e0630a81a51ef5cf4b';
        const resDocs = await axios.get(`https://gestionaleideale.cloud/rest/api/v1/demo-easydashboard/docs`,
            {
                headers: {
                    'Authorization': `token: ${t}`
                }
            }

        )

        //objetivo lo que la api devuelva un array de pares X  , Y

        var arrayDocs = resDocs.data.docs;

        const arrP = [];
        for (var i = 0; i < arrayDocs.length; i++) {
            var par = {
                x: Number(arrayDocs[i].document_date.substring(5, 7)),
                total: arrayDocs[i].total,
                month: Number(arrayDocs[i].document_date.substring(5, 7)),
                date: new Date(arrayDocs[i].document_date)
            }

            arrP.push(par)
        }
        //ordenar par por fechas
        arrP.sort(function (a, b) {
            return (a.date - b.date)
        })

        //promedio //averge
        var averageJanuary = 0; //1
        var averageFebruary = 0; //2
        var averageMarch = 0; //3
        var averageApril = 0;//4
        var averageMay = 0;//5
        var averageJune = 0;//6
        var averageJuly = 0;//7
        var averageAugust = 0;//8
        var averageSeptember = 0;//9
        var averageOctober = 0;//10
        var averageNovember = 0;//11
        var averageDecember = 0;//12

        var contJanuary = 0; //1
        var contFebruary = 0; //2
        var contMarch = 0; //3
        var contApril = 0;//4
        var contMay = 0;//5
        var contJune = 0;//6
        var contJuly = 0;//7
        var contAugust = 0;//8
        var contSeptember = 0;//9
        var contOctober = 0;//10
        var contNovember = 0;//11
        var contDecember = 0;//12

        //siguente objetivo sacar un promedio de por mes de los datos
        for (var i = 0; i < arrP.length; i++) {
            switch (arrP[i].month) {
                case 1:
                    averageJanuary = averageJanuary + Number(arrP[i].total)
                    contJanuary = contJanuary + 1;
                    break;
                case 2:
                    averageFebruary = averageFebruary + Number(arrP[i].total)
                    contFebruary = contFebruary + 1;
                    break;
                case 3:
                    averageMarch = averageMarch + Number(arrP[i].total)
                    contMarch = contMarch + 1;
                    break;
                case 4:
                    averageApril = averageApril + Number(arrP[i].total)
                    contApril = contApril + 1;
                    break;
                case 5:
                    averageMay = averageMay + Number(arrP[i].total)
                    contMay = contMay + 1;
                    break;
                case 6:
                    averageJune = averageJune + Number(arrP[i].total)
                    contJune = contJune + 1;
                    break;
                case 7:
                    averageJuly = averageJuly + Number(arrP[i].total)
                    contJuly = contJuly + 1;
                    break;
                case 8:
                    averageAugust = averageAugust + Number(arrP[i].total)
                    contAugust = contAugust + 1;
                    break;
                case 9:
                    averageSeptember = averageSeptember + Number(arrP[i].total)
                    contSeptember = contSeptember + 1;
                    break;
                case 10:
                    averageOctober = averageOctober + Number(arrP[i].total)
                    contOctober = contOctober + 1;
                    break;
                case 11:
                    averageNovember = averageNovember + Number(arrP[i].total)
                    contNovember = contNovember + 1;
                    break;
                case 12:
                    averageDecember = averageDecember + Number(arrP[i].total)
                    contDecember = contDecember + 1;
                    break;
                default:

                    break;
            }

        }
        //calcular el promedio
        //año de 1 tiene 4 trimestre de 3 mese cada
        var newPares = [
            { x: "January", y: averageJanuary / contJanuary }, //2
            { x: "February", y: averageFebruary / contFebruary }, //2
            { x: "March", y: averageMarch / contMarch }, //3
            { x: "April", y: averageApril / contApril },//4
            { x: "May", y: averageMay / contMay },//5
            { x: "June", y: averageJune / contJune },//6
            { x: "July", y: averageJuly / contJuly },//7
            { x: "August", y: averageAugust / contAugust },//8
            { x: "September", y: averageSeptember / contSeptember },//9
            { x: "October", y: averageOctober / contOctober },//10
            { x: "November", y: averageNovember / contNovember },//11
            { x: "December", y: averageDecember / contDecember },//12

        ]

        var newParesTrimester = [
            { x: "1 trimester", y: (averageJanuary / contJanuary) + (averageFebruary / contFebruary) + (averageMarch / contMarch) }, //2

            { x: "2 trimester", y: (averageApril / contApril) + (averageMay / contMay) + (averageJune / contJune) },//5

            { x: "3 trimester", y: (averageJuly / contJuly) + (averageAugust / contAugust) + (averageSeptember / contSeptember) },//8

            { x: "4 trimester", y: (averageOctober / contOctober) + (averageNovember / contNovember) + (averageDecember / contDecember) },//10


        ]




        const object_data = [{
            id: `sales/quarters`,
            color: '#C800C8',
            data: newParesTrimester
        }
        ]
        //  console.log("object data api express",object_data)

        return object_data;
    }

    const getDocsSalesTrimestrestest = async (t) => {


        // var token = 'a2f62905aa177edfc2e002fbf7a9f9e385899ec522cee3e0630a81a51ef5cf4b';
        const resDocs = await axios.get(`https://gestionaleideale.cloud/rest/api/v1/demo-easydashboard/docs`,
            {
                headers: {
                    'Authorization': `token: ${t}`
                }
            }

        )

        //objetivo lo que la api devuelva un array de pares X  , Y

        var arrayDocs = resDocs.data.docs;

        const arrP = [];
        for (var i = 0; i < arrayDocs.length; i++) {
            var par = {
                x: Number(arrayDocs[i].document_date.substring(5, 7)),
                total: arrayDocs[i].total,
                month: Number(arrayDocs[i].document_date.substring(5, 7)),
                date: new Date(arrayDocs[i].document_date)
            }

            arrP.push(par)
        }
        //ordenar par por fechas
        arrP.sort(function (a, b) {
            return (a.date - b.date)
        })

        var grouplist = []

        var groupformed = []
        //algoritmo
        //paso 1 comparar si la sgiuente fecha es distinto de la fecha actual(comparacion por años)
        //si es distion quiere decir que ya obtube el primer grupo del array
        //paso 2 hacer esto hacer termianar de recorrer todos el array
        var currentDate = arrP[0].date.getFullYear();
        var obj = {
            x: arrP[0].x,
            total: arrP[0].total,
            month: arrP[0].month,
            date: arrP[0].date
        }
        groupformed.push(obj);

        for (var i = 1; i < arrP.length; i++) {
            //   console.log("get time ", arrP[i].date.getTime());

            if (currentDate == arrP[i].date.getFullYear()) {
                var obj = {
                    x: arrP[i].x,
                    total: arrP[i].total,
                    month: arrP[i].month,
                    date: arrP[i].date
                }
                groupformed.push(obj);

            } else {

                grouplist.push(groupformed)
                currentDate = arrP[i].date.getFullYear();

                groupformed = []

                var obj = {
                    x: arrP[i].x,
                    total: arrP[i].total,
                    month: arrP[i].month,
                    date: arrP[i].date
                }
                groupformed.push(obj);
            }

        }

        grouplist.push(groupformed)

        console.log("group list trimester ", grouplist.length)

        var arrayFormartEnd = [];

        const colors_graphic = [{ state: 0, color: "#148122" },
        { state: 0, color: "orange" },
        { state: 0, color: "red" },
        { state: 0, color: "#00C5C8" },
        { state: 0, color: "#C86700" },
        { state: 0, color: "yellow" }]

        for (var i = 0; i < grouplist.length; i++) {
            arrayFormartEnd.push(getFormarArrayTrimester(grouplist[i], colors_graphic))
        }

        
        return arrayFormartEnd;
    }


    function getFormarArrayTrimester(arrP, colors_graphic) {


        var averageJanuary = 0; //1
        var averageFebruary = 0; //2
        var averageMarch = 0; //3
        var averageApril = 0;//4
        var averageMay = 0;//5
        var averageJune = 0;//6
        var averageJuly = 0;//7
        var averageAugust = 0;//8
        var averageSeptember = 0;//9
        var averageOctober = 0;//10
        var averageNovember = 0;//11
        var averageDecember = 0;//12

        var contJanuary = 0; //1
        var contFebruary = 0; //2
        var contMarch = 0; //3
        var contApril = 0;//4
        var contMay = 0;//5
        var contJune = 0;//6
        var contJuly = 0;//7
        var contAugust = 0;//8
        var contSeptember = 0;//9
        var contOctober = 0;//10
        var contNovember = 0;//11
        var contDecember = 0;//12

        var id = arrP[0].date.getFullYear().toString();
        //siguente objetivo sacar un promedio de por mes de los datos
        for (var i = 0; i < arrP.length; i++) {
            switch (arrP[i].month) {
                case 1:
                    averageJanuary = averageJanuary + Number(arrP[i].total)
                    contJanuary = contJanuary + 1;
                    break;
                case 2:
                    averageFebruary = averageFebruary + Number(arrP[i].total)
                    contFebruary = contFebruary + 1;
                    break;
                case 3:
                    averageMarch = averageMarch + Number(arrP[i].total)
                    contMarch = contMarch + 1;
                    break;
                case 4:
                    averageApril = averageApril + Number(arrP[i].total)
                    contApril = contApril + 1;
                    break;
                case 5:
                    averageMay = averageMay + Number(arrP[i].total)
                    contMay = contMay + 1;
                    break;
                case 6:
                    averageJune = averageJune + Number(arrP[i].total)
                    contJune = contJune + 1;
                    break;
                case 7:
                    averageJuly = averageJuly + Number(arrP[i].total)
                    contJuly = contJuly + 1;
                    break;
                case 8:
                    averageAugust = averageAugust + Number(arrP[i].total)
                    contAugust = contAugust + 1;
                    break;
                case 9:
                    averageSeptember = averageSeptember + Number(arrP[i].total)
                    contSeptember = contSeptember + 1;
                    break;
                case 10:
                    averageOctober = averageOctober + Number(arrP[i].total)
                    contOctober = contOctober + 1;
                    break;
                case 11:
                    averageNovember = averageNovember + Number(arrP[i].total)
                    contNovember = contNovember + 1;
                    break;
                case 12:
                    averageDecember = averageDecember + Number(arrP[i].total)
                    contDecember = contDecember + 1;
                    break;
                default:

                    break;
            }

        }
        //calcular el promedio

   
        //   console.log(newPares)

        /*   for (var j = 0; j < newPares.length; j++) {
               if (newPares[j].y == 0) {
                   newPares.splice(j, 1)
               }
           }*/


        //algorithm to add colors
        //1 traverse the array of colors until state is 0
        //if zero, change state to 1
        //2 if the first run no color is available, set all states to 0

        var color_put = "";
        for (var j = 0; j < colors_graphic.length; j++) {
            if (colors_graphic[j].state == 0 && !color_put) {
                color_put = colors_graphic[j].color;
                colors_graphic[j].state = 1;
                //  console.log("color put ", color_put)
            }
        }


        var newParesTrimester = [
            { x: "1 trimester", y: validateDivision(averageJanuary , contJanuary) + validateDivision(averageFebruary , contFebruary) + validateDivision(averageMarch , contMarch) }, //2

            { x: "2 trimester", y: validateDivision(averageApril , contApril) + validateDivision(averageMay , contMay) + validateDivision(averageJune , contJune) },//5

            { x: "3 trimester", y: validateDivision(averageJuly , contJuly) + validateDivision(averageAugust , contAugust) + validateDivision(averageSeptember , contSeptember) },//8

            { x: "4 trimester", y: validateDivision(averageOctober , contOctober) + validateDivision(averageNovember , contNovember) + validateDivision(averageDecember , contDecember) },//10


        ]




        const object_data = {
            id: id,
            color: color_put,
            data: newParesTrimester
        }

        return object_data;
    }






    return router;
};

module.exports = routes;


