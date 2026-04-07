const https = require('https');
const fs = require('fs');
const path = require('path');

const screens = {
    'index.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzNlNmExM2Q2NDdhMjRlNjg5NTU2ZGZkMzIwNGU4YjVmEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'admin.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2Y5YThkZjQyZThiYjQ0MGI5ZTdhODY5MmFlOWVlZmI0EgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'student.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzg0OGNjYjMxZWQ1ZTQ0NDBiM2Y4YTlmYmI3ZGExOWJmEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'exam.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2U5MWEyM2JiOGFjMzQzYjRhOTE0NmVmODk5ZTIwODIyEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'create-exam.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzk4NmRkODMyZjE5MjQ2N2NhMmQ2MWQ2NDJhNDI5OWIxEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'questions-review.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2Q3ZGU5MDg0OWFjMTQ0Y2I4YTVmNzhlOWZkODgxMGRjEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'subjects.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2M0NjU0YWM5MWRkZDQ4NmVhZDg0NGUwNjcyZDMzNTkyEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'proctor.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2JiYjY2MjhlYmNhMzQ3NjQ4NjAzMjA2MDJlODc2MTYzEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'rank-list.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2ZhNDgwNjhlYjVlMjQ4YWNhZWU0NjBlMzI1ZDcxZmUyEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086',
    'results.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzViMzcwNmY3MjUxOTQ5ODBiNzI1NWFiODc1NWFiOWZmEgsSBxCI6PyTmQwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDAxODY1ODkyOTMyNDE0NzYwNA&filename=&opi=89354086'
};

const outputDir = path.join(__dirname, 'public');

Object.entries(screens).forEach(([filename, url]) => {
    https.get(url, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            fs.writeFileSync(path.join(outputDir, filename), rawData);
            console.log('Downloaded', filename);
        });
    }).on('error', (e) => {
        console.error(e);
    });
});
