const Sender = require("./services/Sender");
let user = {
    fcmtoken: 'dHo58shA_ULnhnjyQJ2_dr:APA91bGKujLAN_n73reDL0G1KXBkFMPuYkA1FDshJMpdBMhl_-DvKO-CKzyChz7KutJU1_8jaBB7SIv_5pcY2h7u_YOowGf-bJfyHDh-SgMUWQ541dg7OjU-j_Mqy1lT_LRQxNqPUHm-',
    code: '123456'
};


Sender.send(user.fcmtoken,  user.code);