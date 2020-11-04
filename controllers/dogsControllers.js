// DEPENDENCIES
const router = require('express').Router()
const { Router } = require('express')
const Dog = require('../models/dog')
const User = require('../models/user')
const axios = require('axios')

// CONFIGURATION
const token = process.env.TOKEN

// INDEX ROUTE - SHOW ALL DOGS
router.get('/:userId', (req, res) => {
    User.findById(req.params.userId, (error, foundUser) => {
        let zipCode = foundUser.zipCode
        console.log(typeof(zipCode))
        axios({
            method: 'get',
            headers: { Authorization: `Bearer ${token}` },
            url: `https://api.petfinder.com/v2/animals?type=dog&location=${zipCode}`,
        })
        .then(response => {
            console.log(response.data.animals[1])
            // console.log(response.data.animals[1].contact)
            // console.log(response.data.animals[1].photos[0])
            res.render('dogs/index.ejs', {
                user: foundUser,
                dogs: response.data.animals,
            })
        })
        .catch((error) => {
            console.log('ERROR >>> ', error.response.data)
            console.log(typeof(zipCode))
            console.log(zipCode)
        }) 
    })
})

// CREATE DOG
router.post('/:userId/:animalId', (req, res) => {
    let animalId = req.params.animalId
    let userId = req.params.userId
    //let foundUser = await User.findById(userId)

    // Check if Animal Id is already in Database
    Dog.find({animalId: animalId}, (error, foundDog) => {
        console.log(foundDog)
        if(error) {
            console.log('Error!', error)
            res.send(error)
        }
        //If the dog is not in the DB, find it in the api, add it to the DB and update the user object
        else if(!foundDog.length){
            console.log('api about to be called')
            axios({
                method: 'get',
                headers: { Authorization: `Bearer ${token}` },
                url: `https://api.petfinder.com/v2/animals/${animalId}`,
            })
            .then(response => {
                console.log('response received')
                console.log(response.data.animal)
                let dog = response.data.animal
                let newDog = {
                    animalId: dog.id,
                    name: dog.name,
                    breed: dog.breeds.primary,
                    color: dog.colors.primary,
                    age: dog.age,
                    gender: dog.gender,
                    size: dog.size,
                    interestedOwners: 1,
                }
                // create dog
                Dog.create(newDog, (error, createdDog) => {
                    if(error) res.send(error)
        
                    //Find user and add Dog
                    User.findById(userId, (error, foundUser) => {
                        foundUser.favoriteDogs.push(createdDog)
                        foundUser.save(function (error, savedUser) {
                            if(error) console.log(error)
                            console.log('Saved User', savedUser)
                        })
                    })
                })
                res.redirect(`/dogs/${userId}`)
            })
            .catch((error) => {
                console.log('ERROR >>> ', error)
            }) 
        }
        //If Dog is found in DB, add it as a reference to User Object
        else{
            console.log('in uncoded function')
            User.findById(userId, (error, foundUser) => {
                if(error){
                    console.log('EXISTING DOG ERROR >>> ', error)
                }
                foundDog[0].interestedOwners++
                foundUser.favoriteDogs.push(foundDog[0])
                foundUser.save(function (error, savedUser) {
                    if(error) console.log(error)
                    console.log('Saved User', savedUser)
                })
            })
            res.redirect(`/dogs/${userId}`)
        }
    })
})

// VIEW FAVORITE DOGS
router.get('/:userId/favoriteDogs', (req, res) => {
    User.findById(req.params.userId)
    .populate('favoriteDogs')
    .exec((error, foundUser) => {
        console.log(foundUser)
        if(error){
            console.log('ERROR >>>> ', error)
        }
        let dogs = foundUser.favoriteDogs
        res.render('users/show.ejs', {
            user: foundUser,
            dogs: dogs,
        })
    })
})


module.exports = router