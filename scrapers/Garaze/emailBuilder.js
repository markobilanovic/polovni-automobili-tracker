function getEmailBody(articles) {
    let html = articles.map((article) => {
        return `<div>${getArticleHTML(article)}</div>`;
    });
    html = html.join('<br/>');
    return html;
}

function getArticleHTML(article) {
    const {title, subtitle, articleURL, imageURL, price, year, km, city, cm3, hp} = article;
    const articleHTML = `<div>
        <h2>${title}</h2>
        <a href="${articleURL}">
          <img src="${imageURL}" />
        </a>
        <div>
          <h3>${price}</h3>
          <h3>${year}</h3>
          <h3>${km}</h3>
          <div>${city}</div>
          <br/>
          <div>${cm3}, ${hp}</div>
          ${subtitle ? `<div>${subtitle}</div>` : ""}
        </div>
      </div>`;

    return articleHTML;
}


module.exports = {
    getEmailBody: getEmailBody,
}