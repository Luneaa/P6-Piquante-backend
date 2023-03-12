const Sauce = require('../models/sauce');
const fs = require('fs');

exports.createSauce = (req, res, next) => {
    const sauceObject = JSON.parse(req.body.sauce);
    delete sauceObject._id;
    delete sauceObject._userId;
    const sauce = new Sauce({
        ...sauceObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
        likes: 0,
        dislikes: 0
    });
    console.log(sauce);
    sauce.save()
        .then(() => res.status(201).json({ message: 'Objet enregistré !' }))
        .catch(error => 
            { 
                console.log(error);
                res.status(400).json({ error });
            });
};1

exports.modifySauce = (req, res, next) => {
    const sauceObject = req.file ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body };

    delete sauceObject._userId;
    Sauce.findOne({ _id: req.params.id })
        .then((sauce) => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non autaurisé !' });
            }
            else {
                Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Objet modifié !' }))
                    .catch(error => res.status(400).json({ error }));
            }
        })
        .catch((error) => {
            res.status(400).json({ error });
        });
};

exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non autaurisé !' });
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Sauce.deleteOne({ _id: req.params.id })
                        .then(() => { res.status(200).json({ message: 'Objet supprimé !' }) })
                        .catch(error => res.status(400).json({ error }));
                });
            }
        })
        .catch(error => {
            res.status(500).json({ error });
        });
};

exports.getOneSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => res.status(200).json(sauce))
        .catch(error => res.status(404).json({ error }));
};

exports.getAllSauces = (req, res, next) => {
    Sauce.find()
        .then(sauces => res.status(200).json(sauces))
        .catch(error => res.status(400).json({ error }));
};

exports.likeSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => {
            let hasLiked = sauce.usersLiked.includes(req.auth.userId);
            let hasDisliked = sauce.usersDisliked.includes(req.auth.userId);
            switch(req.body.like){
                case 1:
                    // Like
                    if (hasLiked) return;

                    sauce.usersLiked.push(req.auth.userId);
                    if(hasDisliked){
                        let index = sauce.usersDisliked.indexOf(req.auth.userId);
                        if (index !== -1){
                            sauce.usersDisliked.splice(index, 1);
                        }
                    }
                    break;
                case 0:
                    // Neutre
                    if (hasLiked){
                        let index = sauce.usersLiked.indexOf(req.auth.userId);
                        if (index !== -1){
                            sauce.usersLiked.splice(index, 1);
                        }
                    }
                    if (hasDisliked){
                        let index = sauce.usersDisliked.indexOf(req.auth.userId);
                        if (index !== -1){
                            sauce.usersDisliked.splice(index, 1);
                        }
                    }
                    break;
                case -1:
                    // Dislike
                    if (hasDisliked) return;

                    sauce.usersDisliked.push(req.auth.userId);
                    if(hasLiked){
                        let index = sauce.usersLiked.indexOf(req.auth.userId);
                        if (index !== -1){
                            sauce.usersLiked.splice(index, 1);
                        }
                    }
                    break;
            }

            // Mis a jour des compteurs
            sauce.likes = sauce.usersLiked.length;
            sauce.dislikes = sauce.usersDisliked.length;

            // Sauvegarde
            sauce.save();
        })
        .then(() => res.status(200).json({ message: 'Like mis à jour'}))
        .catch(error => res.status(400).json({error}));
};