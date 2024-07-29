const axios = require('axios');

// Función para crear un issue en Jira
async function createIssue(title, descriptionContent, assignee, resolution, source, formId, priority) {
    const url = 'https://salamancasolutions.atlassian.net/rest/api/3/issue';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic Y2FsbGNlbnRlci5pbnRlZ3JhdGlvbkBudWV2YXRlbC5jb206QVRBVFQzeEZmR0YwM0ppMkxSeFFSQ2g3UVhueDBhajJVelpqaXk0ZVpudFZfVGJhSjFnVElMS1JkTmI3c0NnSTlsNkdycDZra2xiWXliMk9iQjdGNk93N0diSWtXQ2VRbUUzOFpWVm1aTmlNQUp0YmttUklOX0VtdFV5TURvaFdNWWxDZFhhX0hjejhPUkRFbXFRZHVPelY4SGFoSERoTDhGRDR3dWxrY05HNlY3d19aNi16YmVzPTlEM0U1MjU0',
        'Cookie': 'atlassian.xsrf.token=5c6eb553088ff63378c51f44bf105acdfe72466f_lin'
    };

    const data = {
        fields: {
            assignee: {
                id: assignee || null
            },
            issuetype: {
                id: '10101' // ID para el tipo de issue "Task"
            },
            labels: [
                'bugfix',
                'blitz_test'
            ],
            project: {
                id: '15995' // ID del proyecto "SERVICE DESK TEST VIVAMX"
            },
            summary: title.replace(/\r?\n|\r/g, ''), // Elimina caracteres de nueva línea
            description: {
                type: 'doc',
                version: 1,
                content: descriptionContent
            },
            customfield_11214: formId, // Campo requerido "Complaint_ID"
            priority: {
                id: priority // ID de la prioridad
            }
        },
        update: {}
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log('Issue created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating issue:', error.response ? error.response.data : error.message);
    }
}
// Exportar la función para su uso en otros archivos
module.exports = createIssue;
