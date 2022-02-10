function getEmailBody(articles) {
    let html = articles.map((article) => {
        return `<div>${getArticleHTML(article)}</div>`;
    });
    html = html.join('<br/>');
    return html;
}

/*
        id,
        imageURL,
        url,
        price,
        m2,
        rooms,
        floor,
        heat,
        location,
        desc,
*/

function getArticleHTML(article) {
    const {id,
      imageURL,
      url,
      price,
      m2,
      rooms,
      floor,
      heat,
      location,
      desc} = article;
    const articleHTML = `<div>
        <a href="${url}">
          <img src="${imageURL}" />
        </a>
        <div>
          <h3>${price}</h3>
          <h3>${m2}</h3>
          <h3>${rooms}</h3>
          <h3>${location}</h3>
          <div>${floor}</div>
          <div>${heat}</div>
          <div>${desc}</div>
        </div>
      </div>`;

    return articleHTML;
}


module.exports = {
    getEmailBody: getEmailBody,
}