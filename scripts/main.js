// 'use strict';
//
// document.addEventListener("scroll", function(e) {
//     let sticky = document.getElementById("sticky");
//     sticky.classList.toggle("stick", document.body.scrollTop > 160);
// });

// $(window).scroll(function() {
    // $('#sticky').toggleClass('stick', document.body.scrollTop > 160);
    // $('#sticky').toggleClass('stick', $(window).scrollTop( 160 ));
    // $('#sticky').toggleClass('stick', document.body.scrollTop > 160 );
// });


window.onscroll = function() {fixHeaderScroll()};

window.onpopstate = function (e) { window.history.forward(1); }

window.onbeforeunload = function() { window.history.forward(1); };

function fixHeaderScroll() {
    "use strict";
    if (document.body.scrollTop > 160 || document.documentElement.scrollTop > 160) {
        document.getElementById("sticky").className = "stick";
    } else {
        document.getElementById("sticky").className = "";
    }
}


function FriendlyChat() {
    //  const dbRefObject = firebase.database().ref().child('Products').child(productType);
    let stateObj = { view: "home" };
    history.pushState(stateObj, "index.html");

    this.checkSetup();
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.shopping_bag = document.getElementById('shopping-bag');
    $('#order-confirmation').hide();
    $('#products-display').hide();
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.shopping_bag.addEventListener('click', this.cartPreview.bind(this));
    this.initFirebase();
}
// Sets up shortcuts to Firebase features and initiate firebase auth.
FriendlyChat.prototype.initFirebase = function() {
    // Shortcuts to Firebase SDK features.
    // this.createCart(this.createCart.bind(this));
    this.createCart();
    this.auth = firebase.auth();
    this.database = firebase.database();
    // this.users_cart = this.database.ref('users');
    // this.transactionsRef = this.database.ref('transactions');
    this.storage = firebase.storage();
    this.loadHeaderCats(this.loadHeaderCats.bind(this));
    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
    this.carouselSetup();
};
FriendlyChat.prototype.loadHeaderCats = function() {
    let banner_products = ['Bras', 'Undies', 'Bikinis', 'Swimsuits', 'Activewear'],
        header_banner = document.getElementById('header-banner-ul');
    if(header_banner) {
        banner_products.forEach(function(element) {
            let li_element = document.createElement('li'),
                li_text = document.createTextNode(element);
            li_element.addEventListener('click', function() {
                FriendlyChat.prototype.loadProducts(this.id);
            });
            li_element.id = element;
            li_element.className += 'header-item';
            li_element.appendChild(li_text);
            header_banner.appendChild(li_element);
        });
    }

};
FriendlyChat.prototype.carouselSetup = function() {
    let carousel = (function() {
        // Read necessary elements from the DOM once
        let box = document.querySelector('.carouselbox');
        if(box) {
            // current item
            let counter = 0;
            let items = box.querySelectorAll('.content li');
            let amount = items.length;
            let current = items[0];
            box.classList.add('active');
            // navigate through the carousel
            function navigate(direction) {
                // hide the old current list item
                current.classList.remove('current');
                // calculate the new position
                counter = (counter + direction) % amount;
                counter = counter < 0 ? amount - 1 : counter;
                // set new current element
                // and add CSS class
                current = items[counter];
                current.classList.add('current');
            }
            setInterval(function(ev) {
                navigate(1);
            }, 4000);
            navigate(0);
        }
    })();
};
FriendlyChat.prototype.createCart = function() {
    if (localStorage.getItem('shopping_cart') === null) {
        let cart = {};
        cart.items = [];
        let favourites_list = {};
        favourites_list.items = [];

        localStorage.setItem('shopping_cart', JSON.stringify(cart));
        localStorage.setItem('favourites_list', JSON.stringify(favourites_list));
        localStorage.setItem('shipping', 0);
        localStorage.setItem('total', 0);
        localStorage.setItem('total_items', 0);
    }
        document.getElementById("total").innerHTML = '€' + localStorage.getItem('total');
        document.getElementById("item-count").innerHTML = '<p>' + localStorage.getItem('total_items') + '</p>';
};
FriendlyChat.prototype.cartPreview = function() {
    let stateObj = { view: "cart" };
    history.replaceState(stateObj, "cart.html");

    let user = firebase.auth().currentUser;
    if (user !== null) {
        let itemsRef = firebase.database().ref('users/' + user.uid).child('cart').child('items');
        user_name = user.displayName;
        email = user.email;
        photoUrl = user.photoURL;
        emailVerified = user.emailVerified;
        let shopping_cart;

        itemsRef.on('child_added', function(data) {
            console.log('new item found in the items array', data);
        });

        itemsRef.on('child_changed', function(data) {
            console.log('change found in the items array', data);
        });

        itemsRef.on('child_removed', function(data) {
            console.log('item removed from the items array', data);

        });
        itemsRef.once('value', function(snapshot) {
            snapshot.forEach(function(childSnapshot) {
                let childKey = childSnapshot.key;
                let childData = childSnapshot.val();
                shopping_cart = childData;
                return shopping_cart;
            });
        });
        console.log(shopping_cart);

    }

    let user_name, email, photoUrl, emailVerified;
    let cart_preview = document.getElementById('cart-preview');
    let checkout_btn = document.getElementById('checkout-btn');

    cart_preview.removeAttribute('hidden');
    let ul = document.getElementById('product-ul');
    let cart_ul = document.getElementById('cart-ul');
    let cart = localStorage.getItem('shopping_cart'),
        object_cart = JSON.parse(cart),
        total_items = object_cart.items,
        cart_total = document.getElementById('cart-total'),
        shipping_total = document.getElementById('shipping-total'),
        subtotal = document.getElementById('subtotal'),
        shopping_cart = total_items;


    while (ul.firstChild) {
        ul.removeChild(ul.firstChild);
    }

    if(checkout_btn) {
        checkout_btn.addEventListener('click', function(event){
            location.pathname = "/cart.html";
        });
    }

    if(cart_ul) {
        while (cart_ul.firstChild) {
            cart_ul.removeChild(cart_ul.firstChild);
        }
    }

    // total_items.forEach(function(element) {
    shopping_cart.forEach(function(element) {
        let new_product = document.createElement('div'),
            product_column = document.createElement('div'),
            product_info = document.createElement('div'),
            product_img = document.createElement('img'),
            line_li = document.createElement('li'),
            product_name = document.createElement('p'),
            product_size = document.createElement('p'),
            size_text = document.createTextNode('Size: ' + element.size),
            product_color = document.createElement('div'),
            product_price = document.createElement('p'),
            name_text = document.createTextNode(element.name),
            price_text = document.createTextNode('€' + element.price),
            product_quantity = document.createElement('p'),
            quantity_text = document.createTextNode('Qty:' + element.qty);
        // qty_add = document.createElement('div'),
        // qty_rmv = document.createElement('div');
        product_color.className += "color-dot";
        product_color.style.backgroundColor = element.colors;
        // qty_add.className += "qty-add";
        // qty_rmv.className += "qty-rmv";
        product_size.appendChild(size_text);
        new_product.className += "clearfix";
        product_img.className += "cart-img";
        product_name.className += "cart-product-name";
        product_price.className += "cart-product-price";
        product_column.className += "column1 menu";
        product_info.className += "column1 content1";
        product_img.src = element.img_url;
        product_column.appendChild(product_img);
        product_column.appendChild(product_color);
        product_name.appendChild(name_text);
        product_price.appendChild(price_text);
        product_price.appendChild(product_size);
        product_quantity.appendChild(quantity_text);
        product_info.appendChild(product_name);
        product_info.appendChild(product_price);
        product_info.appendChild(product_quantity);
        // product_info.appendChild(qty_add);
        // product_info.appendChild(qty_rmv);
        new_product.appendChild(product_column);
        new_product.appendChild(product_info);
        line_li.appendChild(new_product);
        if(cart_ul) {
            cart_preview.setAttribute('hidden', true);
            cart_total.innerHTML = localStorage.getItem('total');
            shipping_total.innerHTML = localStorage.getItem('shipping');
            subtotal.innerHTML = "Subtotal: " + localStorage.getItem('total');
            return cart_ul.appendChild(line_li);
        }
        else {
            return ul.appendChild(line_li);
        }

    });

    if(object_cart.items) {

    }
    else {
        let empty_cart = document.createElement('div'),
            empty_text = document.createTextNode('Whoops, your cart is empty!');
        empty_cart.appendChild(empty_text);
        cart_preview.appendChild(empty_cart);
    }
    //    this.saveCartTransaction.bind(this);
    let close_cart = document.getElementById('close-cart');
    close_cart.addEventListener('click', function() {
        cart_preview.setAttribute('hidden', true);
    });
    setTimeout(function(){ cart_preview.setAttribute('hidden', true) }, 3000);
};
FriendlyChat.prototype.loadProducts = function(productType) {
    let dbRefObject = firebase.database().ref().child('Products').child(productType);
//    document.getElementById('home-page').style.display = "none";
//    document.getElementById('home-page').style.height = "0px";
    if(location.pathname === "/faqs.html") {
        location.pathname = "/";
    }
    $('#home-page').hide();
    $('.carouselbox').hide();
    $('#products-display').show();
    dbRefObject.once("value").then(function(snapshot) {
        let products = snapshot.val();
        let products_display = document.getElementById('products-display'),
            products_category = document.createElement('h4'),
            category_text = document.createTextNode(productType);
        products_category.appendChild(category_text);
        while (products_display.firstChild) {
            products_display.removeChild(products_display.firstChild);
        }
        products.forEach(function(element) {
            let new_product = document.createElement('div'),
                product_name = document.createElement('h4'),
                name_text = document.createTextNode(element.name),
                product_image = document.createElement('img'),
                product_price = document.createElement('h5'),
                price_text = document.createTextNode(element.price),
                add_cart_button = document.createElement('button'),
                view_item_button = document.createElement('button');
            product_image.setAttribute('src', element.img_url);
            product_name.className += "product-name";
            add_cart_button.innerHTML = "Add to cart";
            add_cart_button.className += "add-cart-button";
            add_cart_button.productInfo = element;
            add_cart_button.addEventListener('click', function() {
                FriendlyChat.prototype.addToCart(this);
            });
            view_item_button.innerHTML = "View product";
            view_item_button.className = "view-product";
            view_item_button.productInfo = element;
            //            view_item_button.click(FriendlyChat.prototype.viewProduct.bind(this));
            view_item_button.addEventListener('click', function() {
                FriendlyChat.prototype.viewProduct.apply(this);
            });
            new_product.className += "product-tile";
            if (element.colors) {
                let list = element.colors;
                let color_holders = document.createElement('div');
                list.forEach(function(element) {
                    let color_tile = document.createElement('div');
                    color_tile.className = "color-tile";
                    color_holders.className = "tile-holder";
                    color_tile.style.backgroundColor = element.color;
                    color_holders.appendChild(color_tile);
                    new_product.appendChild(color_holders);
                });
            }
            product_name.appendChild(name_text);
            product_price.appendChild(price_text);
            new_product.appendChild(product_image);
            new_product.appendChild(product_name);
            new_product.appendChild(product_price);
            new_product.appendChild(view_item_button);
            new_product.appendChild(add_cart_button);
            products_display.appendChild(new_product);
            products_display.insertBefore(products_category, products_display.childNodes[0]);
        });
    });
};
FriendlyChat.prototype.viewProduct = function() {
    let stateObj = { view: "product-view" };
    history.replaceState(stateObj, "/");
    //hide siblings
    //    $(this).parent().nextAll().hide();
    //hide all children
    //    $(this).parent().children().hide();
    $('#products-display').empty();
    $('.carouselbox').hide();
    //this is causing a bug with all other functions, try now without nesting into this.
//    let product = this.productInfo;
    let product = this;
    let new_product = document.createElement('div'),
        product_title = document.createElement('h3'),
        title_text = document.createTextNode(product.productInfo.name),
        images_div = document.createElement('div'),
        //This is where we append everything
        desc_div = document.createElement('div'),
        //Add to my favourites list
        add_fav = document.createElement('div'),
        fav_span = document.createElement('span'),
        i_heart = document.createElement('div'),
        add_text = document.createTextNode('Add to my favourites'),
        //Add a product image
        product_img = document.createElement('img'),
        product_img2 = document.createElement('img'),
        product_img3 = document.createElement('img'),
        //Add product price and currency
        product_price = document.createElement('h5'),
        price_text = document.createTextNode(product.productInfo.price + " EUR"),
        //Colors repeat
        pick_color = document.createElement('h3'),
        color_text = document.createTextNode('Choose a tone'),
        colors_array = product.productInfo.colors,
        //Sizes repeat
        sizes_div = document.createElement('div'),
        //Desc info
        description_button = document.createElement('button'),
        description_panel = document.createElement('div'),
        dpanel_p = document.createElement('p'),
        dp_text = document.createTextNode(product.productInfo.description),
        //Composition info
        composition_button = document.createElement('button'),
        composition_panel = document.createElement('div'),
        panel_p = document.createElement('p'),
        p_text = document.createTextNode(product.productInfo.composition),
        add_cart_button = document.createElement('button'),
        add_cart_toast = document.createElement('div');
        pick_color.appendChild(color_text);
        sizes_div.className += "sizes-div";
        sizes_div.id += "sizes-div";
    //HARD CODED FOR NOW TO GET IT UP AND RUNNING.
    composition_button.className += "accordion change-font";
    description_button.className += "accordion change-font active";
    composition_button.innerHTML += "Composition";
    description_button.innerHTML += "Description";

    composition_button.onclick = function() {
        this.classList.toggle("active");
        let panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    };
    description_button.onclick = function() {
        this.classList.toggle("active");
        let panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    };
    composition_panel.className += "panel";
    description_panel.className += "panel active";
    description_panel.style.display = "block";
    panel_p.appendChild(p_text);
    dpanel_p.appendChild(dp_text);
    composition_panel.appendChild(panel_p);
    description_panel.appendChild(dpanel_p);
    add_cart_toast.id = "snackbar";
    add_cart_button.innerHTML = "Add to cart";
    add_cart_button.className += "add-cart-button pr-view";
    add_cart_button.productInfo = product;
    add_cart_button.addEventListener('click', function() {
        FriendlyChat.prototype.addToCart(product);
    });
    i_heart.className += "fave-heart";
    fav_span.appendChild(i_heart);
    fav_span.appendChild(add_text);
    new_product.className += "view-product-display";
    desc_div.className += "column1 content view-content";
    product_title.className += "product-name";
    product_title.style.display = "inline-block";
    add_fav.productInfo = product.productInfo;
    add_fav.addEventListener('click', function() {
        FriendlyChat.prototype.addToFavourites(this);
    });
    add_fav.className += "view-add-favourites";
    add_fav.appendChild(fav_span);

    images_div.className += "column1 menu pics";
    product_img.className += "preview-image";
    product_img2.className += "mini-image";
    product_img3.className += "mini-image";

    product_title.appendChild(title_text);

    product_img.src = product.productInfo.imgs[0];
    product_img2.src = product.productInfo.imgs[1];
    product_img3.src = product.productInfo.imgs[2];

    product_price.appendChild(price_text);

    images_div.appendChild(product_img);
    images_div.appendChild(product_img2);
    images_div.appendChild(product_img3);

    desc_div.appendChild(images_div);
    desc_div.appendChild(product_title);
    desc_div.appendChild(add_fav);
    desc_div.appendChild(product_price);
    desc_div.appendChild(pick_color);
    //Add color dots
    colors_array.forEach(function(element) {
        let color_dot = document.createElement('div');
        color_dot.id = element.color;
        color_dot.className += "color-dot";
        color_dot.style.backgroundColor = element.color;
        desc_div.appendChild(color_dot);
        color_dot.addEventListener('click', function(){
            $(this).addClass('active-color').siblings().removeClass('active-color');
            element.productInfo = product.productInfo;
            product.productInfo.colors = $(this).attr('id');
            FriendlyChat.prototype.getSizes(element);
        });
    });
    //Add color dots
    desc_div.appendChild(sizes_div);
    desc_div.appendChild(description_button);
    desc_div.appendChild(description_panel);
    desc_div.appendChild(composition_button);
    desc_div.appendChild(composition_panel);
    desc_div.appendChild(add_cart_button);
    desc_div.appendChild(add_cart_toast);
    new_product.appendChild(images_div);
    new_product.appendChild(desc_div);
    $('#products-display').append(new_product);
};
FriendlyChat.prototype.getSizes = function(color) {
    let passed_color = color;
    let sizes_array = passed_color.sizes;
    let sizes = document.getElementById('sizes-div');
    let warningDiv = document.createElement('div');
    warningDiv.className += "warning-div";
    warningDiv.id += "warning-div";

    while (sizes.firstChild) {
        sizes.removeChild(sizes.firstChild);
    }
    sizes_array.forEach(function(element){
        console.log(element);
        console.log(element.qty);
        if(element.qty <= 0) {
            let span = document.createElement('div');
            span.className += "size-span";
            span.innerHTML = element.size;

            span.addEventListener('click', function(){
                $(this).addClass('active-size').siblings().removeClass('active-size');
                passed_color.productInfo.size = $(this).html();
                passed_color.productInfo.qty = 0;
                console.log(passed_color.productInfo);
                FriendlyChat.prototype.stockQuantityWarningMessage(element);
            });
            $('#sizes-div').append(span);
            $('#sizes-div').append(warningDiv);
        }
        else {
            let span = document.createElement('div');
            span.className += "size-span";
            span.innerHTML = element.size;

            span.addEventListener('click', function(){
                $(this).addClass('active-size').siblings().removeClass('active-size');
                passed_color.productInfo.size = $(this).html();
                passed_color.productInfo.qty = 1;
                FriendlyChat.prototype.stockQuantityWarningMessage(element);
            });

            $('#sizes-div').append(span);
            $('#sizes-div').append(warningDiv);
        }

    });
};

FriendlyChat.prototype.stockQuantityWarningMessage = function (element) {
    let warningDiv = document.getElementById('warning-div');
    while (warningDiv.firstChild) {
        warningDiv.removeChild(warningDiv.firstChild);
    }

    if (element.qty <= 5) {
        let warningMessage = document.createElement('div');
        warningMessage.className += "warning-stock-level";
        if (element.qty === 0 || !element.qty || element.qty === undefined) {
            warningMessage.innerHTML = "Whoops! You're too late, this item is sold out";
        }
        else {
            warningMessage.innerHTML = "Hurry! There's only " + element.qty + " left in stock";
        }
        warningDiv.appendChild(warningMessage);
        $('#sizes-div').append(warningDiv);
    }
};
FriendlyChat.prototype.addToFavourites = function(item) {
    let user = firebase.auth().currentUser;
    let user_name, email, photoUrl, emailVerified;
    $('.fave-heart').toggleClass('update-total');
    // $('.fave-heart').css('background-image', 'url(' + '/images/if_relationships_101822.svg' + ')');

    if (user != null) {
        user_name = user.displayName;
        email = user.email;
        photoUrl = user.photoURL;
        emailVerified = user.emailVerified;
    };

    let favourites_list = localStorage.getItem('favourites_list');
        let list_object = JSON.parse(favourites_list);
        let list_copy = list_object;
    let items = list_copy.items;
    let product = item.productInfo;

        localStorage.setItem('favourites_list', JSON.stringify(list_copy));
    //Item about to be added to the list

    let reformattedArray = items.map(function(obj) {
        let rObj = obj;
        return rObj;
    });

    function checkForDuplicates(element) {
        return element.size === product.size && element.colors === product.colors && element.name === product.name;
    }
    if(list_object.items.length > 0) {
        let matchedItem = items.find(checkForDuplicates);
        if(matchedItem) {
            let currentQty = matchedItem.qty;
            matchedItem.qty = Number(currentQty) + 1;
            list_copy.items = reformattedArray;
        }
        else {
            items.push(product);
        }
    }
    else if (list_object.items.length === 0) {
        items.push(product);
    }

    if (user) {
        console.log('the user check is running correctly');
        return this.writeCartToUser(user, list_copy, 'favourites');
    } else {
        console.log('the user check is not running properly');
    }
    localStorage.setItem('favourites_list', JSON.stringify(list_copy));
};
FriendlyChat.prototype.warningToast = function (textString) {
    "use strict";
        let x = document.getElementById("snackbar");
        x.className = "show";
        x.innerHTML = textString;
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);

};
FriendlyChat.prototype.addToCart = function(item) {
    let user = firebase.auth().currentUser;
    let user_name, email, photoUrl, emailVerified;

    if (user != null) {
        user_name = user.displayName;
        email = user.email;
        photoUrl = user.photoURL;
        emailVerified = user.emailVerified;
    };

    //Get cart
    const cart = localStorage.getItem('shopping_cart');
    //Get the total
    const total = localStorage.getItem('total');
    //Make object
    const cartObject = JSON.parse(cart);
    //Make the object
    const totalObject = JSON.parse(total);
    //copy the cart
    const cartCopy = cartObject;
    //copy the total
    const totalCopy = totalObject;
    //get original items
    // let og_items = cartObject.items;
    //get the cart items
    let items = cartCopy.items;
    //Item about to be added to the cart
    const currentItem = item.productInfo;
    let newTotal = document.getElementById("total");
    let newItemCount = document.getElementById("item-count");
    let newShoppingBag = document.getElementById('shopping-bag');
    $(".shopping-bag").toggleClass("add-to-cart");
    $(".item-count").toggleClass("update-total");
    // newShoppingBag.className += " add-to-cart";
    // newItemCount.className += " update-total";

    console.log('this is the current item that is oging to be added to the cart', currentItem);

    if (currentItem.colors.length > 1 && currentItem.size === undefined) {
        console.error('this item should not be added to the cart');
        console.error(currentItem.colors.length);

        // let warningString = (typeof currentItem.colors === 'object' && currentItem.size === undefined)? "Whoops! \n You must select the size before you can add an item to the cart. \n Please try again" : "Whoops! \n You must select the size and colour before you can add an item to the cart. \n Please try again";
        let warningString = (!(Array.isArray(currentItem.colors)) && currentItem.size === undefined)? "Whoops! \n You must select the size before you can add an item to the cart. \n Please try again" : "Whoops! \n You must select the size and colour before you can add an item to the cart. \n Please try again";

        FriendlyChat.prototype.warningToast(warningString);
    }
    else if (currentItem.qty <= 0 ) {
        let warningString = "Whoops. You're too late. This item is sold out. Please try another color or size."
        FriendlyChat.prototype.warningToast(warningString);
    }
    else {
        let new_item_count = Number(localStorage.getItem('total_items')) + 1;

        let reformattedArray = items.map(function(obj) {
            let rObj = obj;
            return rObj;
        });
        function checkForDuplicates(element) {
            return element.size === currentItem.size && element.colors === currentItem.colors && element.name === currentItem.name;
        }
        if(cartObject.items.length > 0) {
            let matchedItem = items.find(checkForDuplicates);
            if(matchedItem) {
                let currentQty = matchedItem.qty;
                matchedItem.qty = Number(currentQty) + 1;
                cartCopy.items = reformattedArray;
            }
            else {
                items.push(currentItem);
            }
        }
        else if (items.length === 0) {
            items.push(currentItem);
        }

        localStorage.setItem('shopping_cart', JSON.stringify(cartCopy));
        localStorage.setItem('total', totalCopy + currentItem.price);
        localStorage.setItem('total_items', JSON.stringify(new_item_count));
        // Update the html view
        newTotal.innerHTML = '€' + localStorage.getItem('total');
        newItemCount.innerHTML = '<p>' + new_item_count + '</p>';
        this.cartPreview();

        if (user) {
            console.log('the user check is running correctly');
            return this.writeCartToUser(user, cartCopy, 'cart');
        } else {
            console.log('the user check is not running properly');
        }
    }
};
//Call the server code to start creating the transaction to process payment with - data which cannot be manipulated - fallback
//    FriendlyChat.prototype.createTransaction();
FriendlyChat.prototype.updateDataBaseAddProduct = function(arrayofProducts) {
    console.log('this is the array of products', arrayofProducts);

    let cartProductsArray = arrayofProducts;

    cartProductsArray.forEach(function(itemFromCart) {
        "use strict";
        let dbRefObject = firebase.database().ref().child('Products').child(itemFromCart.category);
        dbRefObject.once("value")
            .then(function(snapshot) {
                let databaseProducts = snapshot.val();
                console.log('this is a response from the database when checking the category per product from cart', databaseProducts);
                databaseProducts.forEach(function(databaseCatProducts, productIndex) {
                    console.log('this is the index position whilst looping through the underwear products', productIndex);
                    if(databaseCatProducts.name === itemFromCart.name) {
                        console.log('this is the item where we need to edit the color qty', databaseCatProducts);
                        if (databaseCatProducts.colors.indexOf(itemFromCart.colors)) {
                            console.log('the color is included in the database color array', databaseCatProducts);
                            databaseCatProducts.colors.forEach(function(eachColorPerItem, colorIndex) {
                               if(eachColorPerItem.color === itemFromCart.colors) {
                                   console.log('this is the exact color where we want to change the qty', eachColorPerItem);
                                   eachColorPerItem.sizes.forEach(function(sizePerColor, sizeIndex) {
                                      console.log('size per color for matching color', sizePerColor);
                                      console.log('index per color for matching color', colorIndex);
                                      if(sizePerColor.size === itemFromCart.size) {
                                          let newQty = Number(sizePerColor.qty) - 1;
                                          console.log('this is the exact size whose QTY we need to edit', sizePerColor, 'index', sizeIndex);
                                          let exactProductRef = dbRefObject.child(productIndex).child('colors').child(colorIndex).child('sizes').child(sizeIndex)
                                              .update({qty: newQty })
                                              .then(function() {
                                                  console.log('woop woop. successfully updated the QTY of the object in the database');
                                              })
                                              .catch(function(error) {
                                                  console.error('Error writing new qty amount to Firebase Database', error);
                                              });
                                      }
                                   });
                               }
                            });
                        }
                    }
                });
            });
    });

    // let dbRefObject = firebase.database().ref().child('Products').child();
    //
    // dbRefObject.once("value")
    //     .then(function(snapshot) {
    //         let databaseProducts = snapshot.val();
    //         console.log('this is a response from the database', databaseProducts);
    //     });


    // databaseProducts.forEach(function(productCategory) {
            //     "use strict";
            //     console.log('this is a foreach iteration inside the database response', productCategory);
            //     // if(product.indexOf())
            //     cartProductsArray.forEach(function(passedProduct){
            //         if(passedProduct.indexOf(productCategory))
            //
            //     });
            // });


            // cartProductsArray.forEach(function(passedProduct) {
            //     databaseProducts.forEach(function(databaseCat) {
            //         console.log('foreachDatabase', databaseCat);
            //         // if(databaseCat.indexOf(passedProduct.category, 0)) {
            //         //     console.log('this passed product does exist in the database and it found the right category');
            //         // } else {
            //         //     console.log('this does not occur in the database, which is impossible');
            //         // }
            //     });


        // });

};
FriendlyChat.prototype.writeCartToUser = function(user, array, destination) {
    let current_user = user;
    firebase.database().ref('users/' + current_user.uid).child(destination)
        .set({
            items: [array.items]
        })
        .then(function() {
            console.log('woop woop. successfully added to the users cart object');
        }.bind(this))
        .then(function() {
            FriendlyChat.prototype.updateDataBaseAddProduct(array.items);
        })
        .catch(function(error) {
            console.error('Error writing new message to Firebase Database', error);
        });


};

// Saves a new message on the Firebase DB.
//FriendlyChat.prototype.saveCartTransaction = function(e) {
//    e.preventDefault();
//    // Check that the user entered a message and is signed in.
//    //  if (this.messageInput.value && this.checkSignedInWithMessage()) {
//    let currentUser = this.auth.currentUser;
//    // Add a new message entry to the Firebase Database.
//    this.transactionsRef.push({
//        name: currentUser.displayName
//    }).then(function() {
//        console.log('we did it');
//        // Clear message text field and SEND button state.
//        //      FriendlyChat.resetMaterialTextfield(this.messageInput);
//        //      this.toggleButton();
//    }.bind(this)).catch(function(error) {
//        console.error('Error writing new message to Firebase Database', error);
//    });
//    //  }
//};
// Sets the URL of the given img element with the URL of the image stored in Cloud Storage.
//FriendlyChat.prototype.setImageUrl = function(imageUri, imgElement) {
//  // If the image is a Cloud Storage URI we fetch the URL.
//  if (imageUri.startsWith('gs://')) {
//    imgElement.src = FriendlyChat.LOADING_IMAGE_URL; // Display a loading image first.
//    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
//      imgElement.src = metadata.downloadURLs[0];
//    });
//  } else {
//    imgElement.src = imageUri;
//  }
//};
// Signs-in Friendly Chat.
FriendlyChat.prototype.signIn = function() {
    // Sign in Firebase using popup auth and Google as the identity provider.
    let provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider);
};
// Signs-out of Friendly Chat.
FriendlyChat.prototype.signOut = function() {
    // Sign out of Firebase.
    this.auth.signOut();
};
// Triggers when the auth state change for instance when the user signs-in or signs-out.
FriendlyChat.prototype.onAuthStateChanged = function(user) {
    if (user) { // User is signed in!
        this.signOutButton.removeAttribute('hidden');
        // Hide sign-in button.
        this.signInButton.setAttribute('hidden', 'true');
        // We load currently existing chant messages.
        //    this.loadMessages();
        // We save the Firebase Messaging Device token and enable notifications.
        this.saveMessagingDeviceToken();
    } else { // User is signed out!
        // Hide user's profile and sign-out button.
        //    this.userName.setAttribute('hidden', 'true');
        //    this.userPic.setAttribute('hidden', 'true');
        this.signOutButton.setAttribute('hidden', 'true');
        // Show sign-in button.
        this.signInButton.removeAttribute('hidden');
    }
};
// Returns true if user is signed-in. Otherwise false and displays a message.
FriendlyChat.prototype.checkSignedInWithMessage = function() {
    // Return true if the user is signed in Firebase
    let user = firebase.auth().currentUser;
    if(user) {
        return true;
    }
    // if (this.auth.currentUser) {
    //     return true;
    // }
    // Display a message to the user using a Toast.
    // let data = {
    //     message: 'You must sign-in first',
    //     timeout: 2000
    // };
    // this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
};
// Saves the messaging device token to the datastore.
FriendlyChat.prototype.saveMessagingDeviceToken = function() {
    firebase.messaging().getToken().then(function(currentToken) {
        if (currentToken) {
            console.log('Got FCM device token:', currentToken);
            // Saving the Device Token to the datastore.
            firebase.database().ref('/fcmTokens').child(currentToken).set(firebase.auth().currentUser.uid);
        } else {
            // Need to request permissions to show notifications.
            this.requestNotificationsPermissions();
        }
    }.bind(this)).catch(function(error) {
        console.error('Unable to get messaging token.', error);
    });
};
// Requests permissions to show notifications.
FriendlyChat.prototype.requestNotificationsPermissions = function() {
    console.log('Requesting notifications permission...');
    firebase.messaging().requestPermission().then(function() {
        // Notification permission granted.
        this.saveMessagingDeviceToken();
    }.bind(this)).catch(function(error) {
        console.error('Unable to get permission to notify.', error);
    });
};
FriendlyChat.prototype.showQuestions = function(category) {
    console.log(this);
    let cat = this;
    //    let sects = document.getElementsByClassName('faq-section');
    let sections = [].slice.call(document.getElementsByClassName("faq-section"));
    let icons = [].slice.call(document.getElementsByClassName("faq-cats"));
    sections.forEach(function(element) {
        cat.classList.toggle('active-faq');
        if (cat.id === element.title) {
            console.log('this is what you looking for');
            element.removeAttribute('hidden');
        } else {
            element.setAttribute('hidden', true);
        }
    });
};
FriendlyChat.prototype.payPalCheckout = function() {
    //Get the total price fr the cart
    let total_price = JSON.parse(localStorage.getItem('total'));

    let get_items = JSON.parse(localStorage.getItem('shopping_cart'));
    let local_items = get_items.items;

    let paypal_items = local_items.map(function(element) {
        let obj = {};
        obj.name = element.name;
        obj.sku = element.name;
        obj.price = element.price.toFixed(2);
        obj.currency = "EUR";
        obj.quantity = element.qty;
        return obj;
    });

    console.log(paypal_items);
    console.log(total_price);

    paypal.Button.render({

        env: 'sandbox', // Or 'sandbox'

        client: {
            sandbox: 'AVgU8_8H5pUASmivdzt9vVoiZLY5bByaYeBoepWJWxRzFw1tuhgzQoxCyYxJ79Snl6ik26zrjYXPUAC3'
        },

        commit: true, // Show a 'Pay Now' button

        payment: function(data, actions) {
            return actions.payment.create({
                payment: {
                    transactions: [
                        {
                            amount: { total: total_price, currency: 'EUR' },
                            item_list: {
                                items:  paypal_items
                            }
                        }
                    ]
                }
            });
        },

        onAuthorize: function(data, actions) {
            return actions.payment.execute().then(function(payment) {
                console.log(payment);
                $('#cart-page').hide();
                $('#order-confirmation').show();
                $('#order-preview').html(
                    "<h1>" + payment.state + "</h1>" +
                    "<div class=\"order-info\"><h4>Order ID:" + payment.id + "</h4> <h4>Status:" + payment.state + "</h4></div>"
                );
                localStorage.setItem('total', 0);
                localStorage.setItem('total_items', 0);
                let object = {};
                object.items = [];
                localStorage.setItem('shopping_cart', JSON.stringify(object));
                return FriendlyChat.prototype.createCart();
            });
        }

    }, '#paypal-button');
};

// Checks that the Firebase SDK has been correctly setup and configured.
FriendlyChat.prototype.checkSetup = function() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions and make ' +
            'sure you are running the codelab using `firebase serve`');
    }
};

window.onload = function() {
    window.friendlyChat = new FriendlyChat();
};