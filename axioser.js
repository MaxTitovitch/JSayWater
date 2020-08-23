var FormData = require('form-data');
var axios = require('axios')

const form = new FormData();

// form.append('name', 'Иван');
// form.append('phone', '+380992027711');
// form.append('fcmtoken', '029389203482903');
form.append('token', '1whps55hw9wavm3fevs5ux6qdwtu91jt');
form.append('photo', '/aoo/123.git');

// In Node.js environment you need to set boundary in the header field 'Content-Type' by calling method `getHeaders`
const formHeaders = form.getHeaders();

axios.get('http://localhost:3000/get-photo', form, {
    headers: {
        ...formHeaders,
        'Content-Type': 'multipart/form-data'
    },
})
    .then(response => console.log(response))
    .catch(error => console.log(error.response))