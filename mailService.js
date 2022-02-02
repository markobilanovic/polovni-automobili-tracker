const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport(
    {
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
            user: 'bilanovic.dev@gmail.com',
            pass: 'Z0idberg'
        },
    }
);

const from = `Bilanovic dev <b***@gmail.com>`;

async function sendEmail(to, subject, text, html) {
    const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
            return 500;
        } else {
            console.log('Email sent: ' + info.response);
            return 200;
        }
    });
}

module.exports = {
    sendEmail: sendEmail,
}