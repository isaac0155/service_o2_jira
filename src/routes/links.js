const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth')
const createIssue = require('./jira/new_ticket');
const { runInContext } = require('vm');

var ret = (io) => {
    io.on("connection", (socket) => {
        socket.on('websocket', async (user) => {
            // Tu lógica aquí
        });
    });

    router.get('/', async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const result = await connection.execute(
                `SELECT form_id, service_identifier, complaint_date,
                source, priority, complaint_text, resolution_text
                FROM customer_care.complaint
                WHERE status = 'A'
                AND form_status = 'IN_PROCESS'
                AND specialist_group_id IN (1641, 1645)
                AND trunc_complaint_date >= trunc(SYSDATE-250)
                AND EXISTS (SELECT *
                            FROM PROCS.process_flow_action_active
                            WHERE process_id = complaint.ext_proc_id
                            AND form_id = complaint.form_id
                            AND flow_id = 317)`
            );

            // Asumiendo que result.rows es un array de arrays
            const formattedRows = await Promise.all(result.rows.map(async (row) => {
                let [formId, serviceIdentifier, complaintDate, source, priority, complaintText, resolutionTextStream] = row;

                // Verificar si resolutionTextStream es null
                let resolutionText = resolutionTextStream ? await streamToString(resolutionTextStream) : null;

                return {
                    form_id: formId,
                    service_identifier: serviceIdentifier,
                    complaint_date: complaintDate,
                    source: source,
                    priority: priority,
                    complaint_text: complaintText,
                    resolution_text: resolutionText
                };
            }));
            const tickets = [];

            for (let element of [formattedRows[0]]) {
                const title = extractProblemType(element.complaint_text) + ' - ' + String(element.source)+ ' - '+String(element.form_id);

                let cuerpo = `-CREADO EN: ${new Date(element.complaint_date).toLocaleString()}
<BR>-SISTEMA: ${element.source}
<BR>-PRIORIDAD: ${element.priority}
<BR>--
<BR>${element.complaint_text}<BR>-RESPUESTA 2DA LINEA: ${element.resolution_text}`
                const descriptionContent = cuerpo.split('\r<BR>').map(line => ({
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: line.replace(/<[^>]*>?/gm, '') // Remueve etiquetas HTML innecesarias
                        }
                    ]
                }));
                var tick = ''
                let priority = element.priority == 'ALTA' ? '2' : element.priority == 'BAJA'? '4' : '3'
                //console.log(priority)
                await createIssue(title, descriptionContent, '', element.resolution_text, element.source, String(element.form_id), priority)
                    .then(issue => {
                        //console.log('Issue creado:', issue);
                        tickets.push(issue);
                        tick = issue
                    })
                    .catch(error => {
                        console.error('Error al crear el issue:', error);
                    });

                //logs
                await connection.execute(
                    `INSERT INTO tshot.complaint_jira_integration (id, date_tran, complaint_id, jira_issue, answer, resolution) VALUES (:id, SYSDATE, :complaint_id, :jira_issue, :answer, :resolution)`,
                    {
                        id: +element.service_identifier, // Reemplaza con el ID correspondiente
                        complaint_id: element.form_id, // Reemplaza `elemento` con el nombre de tu variable que contiene los datos
                        jira_issue: tick.key, // Trunca el valor de jira_issue a 10 caracteres
                        answer: '', // Reemplaza con la respuesta correspondiente
                        resolution: ''
                    },
                    { autoCommit: true } // Auto-commit para guardar los cambios
                );


            }
            res.send({tickets,formattedRows});
        } catch (err) {
            res.status(500).send({ error: err.message });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    res.status(500).send({ error: err.message });
                }
            }
        }
    });

    async function streamToString(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf-8');
    }
    // Función para extraer el tipo de problema del texto
    function extractProblemType(complaintText) {
        const match = complaintText.match(/TIPO\s*(DE\s*)?PROBLEMA:\s*(.*?)(\r<BR>|$)/);
        return match ? match[2].trim() : 'Sin Título';
    }
    return router;
}

module.exports = ret;
