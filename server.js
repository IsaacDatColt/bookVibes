require('dotenv').config();
const express = require('express');
const layouts = require('express-ejs-layouts');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/ppConfig');
const isLoggedIn = require('./middleware/isLoggedIn');
const axios = require('axios');
const { user, book, favorite } = require('./models');

// Environment variables
const SECRET_SESSION = process.env.SECRET_SESSION;
const API_KEY = process.env.API_KEY;

app.set('view engine', 'ejs');

app.use(require('morgan')('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(layouts);

app.use(flash());
app.use(session({
  secret: SECRET_SESSION,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.alerts = req.flash();
  res.locals.currentUser = req.user;
  next();
});

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Route for explore page
app.get('/explore', isLoggedIn, (req, res) => {
  res.render('explore', { books: [], search: '' });
});

// bookSearch
app.get('/bookSearch/:genre/:title', function (req, res) {
  axios.get(`https://www.googleapis.com/books/v1/volumes?q=genre:${encodeURIComponent(req.params.genre)}+intitle:${encodeURIComponent(req.params.title)}&maxResults=1&key=${API_KEY}`)
    .then(function (response) {
      if (response.data.items && response.data.items.length > 0) {
        const book = response.data.items[0].volumeInfo;
        res.render('single-book', { book });
      } else {
        console.log('Book not found.');
        res.json({ message: 'Book not found.' });
      }
    })
    .catch(function (error) {
      console.log('Error fetching data:', error);
      res.json({ message: 'Data not found. Please try again later.' });
    });
});

// POST route for book search
app.post('/bookSearch', isLoggedIn, (req, res) => {
  const { genre, author, title, category, isbn } = req.body;

  let query = '';

  if (genre) {
    query += `genre:${genre} `;
  }

  if (author) {
    query += `inauthor:${author} `;
  }

  if (title) {
    query += `intitle:${title} `;
  }

  if (category) {
    query += `category:${category} `;
  }

  if (isbn) {
    query += `isbn:${isbn} `;
  }

  const maxResults = 40; // number of books to fetch

  axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${API_KEY}`)
    .then(function (response) {
      if (response.data.items && response.data.items.length > 0) {
        const books = response.data.items.map(item => item);
        // console.log('Search Results:', books);

        let filteredBooks;

        if (req.body.searchType === 'author') {
          filteredBooks = books.filter(book => book.volumeInfo.authors && book.volumeInfo.authors.join(', ').toLowerCase().includes(req.body.search.toLowerCase()));
        } else if (req.body.searchType === 'title') {
          filteredBooks = books.filter(book => book.volumeInfo.title && book.volumeInfo.title.toLowerCase().includes(req.body.search.toLowerCase()));
        } else if (req.body.searchType === 'category') {
          filteredBooks = books.filter(book => book.volumeInfo.categories && book.volumeInfo.categories.join(', ').toLowerCase().includes(req.body.search.toLowerCase()));
        } else if (req.body.searchType === 'isbn') {
          filteredBooks = books.filter(book => book.volumeInfo.industryIdentifiers && book.volumeInfo.industryIdentifiers.some(identifier => identifier.identifier.toLowerCase().includes(req.body.search.toLowerCase())));
        } else {
          filteredBooks = books;
        }
        console.log('FILTERED BOOKS', filteredBooks);
        res.render('search', { books: filteredBooks, search: query });
      } else {
        console.log('No books found.');
        res.render('search', { books: [], search: query });
      }
    })
    .catch(function (error) {
      console.log('Error fetching data:', error);
      res.render('search', { books: [], search: query });
    });
});

// Add book to favorites
app.post('/favorites/add', async (req, res) => {
  const { bookId } = req.body;
  const userId = req.user.id;
  console.log('BOOK ID', bookId);
  try {
    const fav = await favorite.findOne({
      where: {
        userId: userId,
        bookId: bookId
      }
    });

    if (fav) {
      // Book already in favorites, handle accordingly
    } else {
      // Add book to favorites
      await favorite.create({
        userId: userId,
        bookId: bookId
      });
    }
  } catch (error) {
    console.error('Error adding book to favorites:', error);
  }

  res.redirect('/explore');
});

// Favorites page route
app.get('/favorites', isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Get all the user's favorite book IDs
    const userFavorites = await favorite.findAll({
      where: {
        userId: userId
      }
    });

    console.log('User Favorites:', userFavorites);

    // Step 2: Fetch the book details for the favorite books from the API
    const favoriteBooks = [];

    for (const userFavorite of userFavorites) {
      try {
        const bookId = userFavorite.bookId;
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${bookId}?key=${API_KEY}`);
        favoriteBooks.push(response.data);
      } catch (error) {
        console.error('Error fetching book details:', error);
      }
    }

    res.render('favorites', { books: favoriteBooks });

  } catch (error) {
    console.error('Error retrieving user favorites:', error);
    res.render('favorites', { books: [] });
  }
});

// Search page route
app.get('/search', isLoggedIn, (req, res) => {
  res.render('search', { books: [] });
});

app.use('/auth', require('./controllers/auth'));

app.get('/profile', isLoggedIn, async (req, res) => {
  const { id, name, email } = req.user;
  res.render('profile', { id, name, email });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🎧 You're listening to the smooth sounds of port ${PORT} 🎧`);
});

module.exports = server;
