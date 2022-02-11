function getEmailBody(articles) {
    let html = articles.map((article) => {
        return `<div>${getArticleHTML(article)}</div>`;
    });
    html = html.join('<br/>');
    return html;
}

function getArticleHTML(article) {
    const {title,
      imageURL,
      url,
      price,
      location,
      description} = article;
    const articleHTML = `<div>
        <h2>${title}</h2>
        <a href="${url}">
          <img src="${imageURL}" />
        </a>
        <div>
        <h3>${price}</h3>
        <h3>${location}</h3>
          <h3>${description}</h3>
        </div>
      </div>`;

    return articleHTML;
}


module.exports = {
    getEmailBody: getEmailBody,
}