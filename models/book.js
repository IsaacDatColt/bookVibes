'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class book extends Model {
        static associate(models) {
            // Book belongs to a user
            book.belongsTo(models.user, { foreignKey: 'userId' });

            // Book has many favorites
            book.hasMany(models.favorite, { foreignKey: 'bookId' }); // Update 'Favorite' to match the model name
        }


    }

    book.init({
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        author: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isbn: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        sequelize,
        modelName: 'book',
        tableName: 'books'
    });

    return book;
};