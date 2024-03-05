class Carousel {

    /**
     * This callback type is called 'requestCallback' and is displayed as a global symbol.
     * 
     * @callback moveCallback
     * @param {number} index 
     */

    /**
     * @param {HTMLElement} element 
     * @param {Object} options
     * @param {Object} [options.slidesToScroll=1] Nombre d'éléments à faire défiler
     * @param {Object} [options.slidesVisible=1] Nombre d'éléments visible dans un slide
     * @param {Boolean} [options.loop=false] Doit on boucler en fin de carrousel
     * @param {Boolean} [options.infinite=false] Doit on boucler à l'infini
     * @param {Boolean} [options.pagination=false] 
     * @param {Boolean} [options.navigation=true] 
     */
    constructor (element, options = {}){
        this.element = element
        this.options = Object.assign({}, {
            slidesToScroll: 1,
            slidesVisible: 1,
            loop: false,
            pagination: false,
            navigation: true,
            infinite: false
        }, options)
        if (this.options.loop && this.options.infinite) {
            throw new Error('Un carousel ne peut être a la fois en boucle et en infini')
        }
        let children = [].slice.call(element.children)
        this.isMobile = false
        this.currentItem = 0
        this.moveCallbacks = []
        this.offset = 0

        // Modification du DOM
        this.root =  this.createDivWIthClass('carousel')
        this.container =  this.createDivWIthClass('carousel__container')
        this.root.setAttribute('tabindex', '0')
        this.root.appendChild(this.container)
        this.element.appendChild(this.root)
        this.items = children.map((child) => {
            let item = this.createDivWIthClass('carousel__item')
            item.appendChild(child) 
            return item  
        })
        if (this.options.infinite) {
            this.offset = this.options.slidesVisible + this.options.slidesToScroll - 1
            this.items = [
                ...this.items.slice(this.items.length - this.offset).map(item =>item.cloneNode(true)),
                ...this.items,
                ...this.items.slice(0, this.offset).map(item =>item.cloneNode(true)),
            ]
            this.gotoItem(this.offset, false)
        }
        this.items.forEach(item => this.container.appendChild(item))
        this.setStyle()
        if (this.options.navigation) {
            this.createNavigation()
        }
        if (this.options.pagination){
            this.createPagination()
        }

        // Evenements
        this.moveCallbacks.forEach(cb => cb(this.currentItem))
        this.onWindowResize()
        window.addEventListener('resize', this.onWindowResize.bind(this))
        this.root.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowRight') {
                this.next()
            } else if (e.key === 'ArrowLeft') {
                this.prev()
            }
        })
        if (options.infinite){
            this.container.addEventListener('transitionend', this.resetInfinite.bind(this))
        }
        new carouselTouchPlugin(this)
    }

    /**
     * Applique les bonnes dimensions aux éléments du carousel
     */
    setStyle () {
        let ratio = this.items.length / this.slidesVisible
        this.container.style.width = (ratio * 100) + "%"
        this.items.forEach(item => item.style.width = ((100 / this.slidesVisible) / ratio) + "%");

    }

    /**
     * Crée les fleches de navigations
     */
    createNavigation(){
        let nextButton = this.createDivWIthClass('carousel__next')
        let prevButton = this.createDivWIthClass('carousel__prev')
        this.root.appendChild(nextButton)
        this.root.appendChild(prevButton)
        nextButton.addEventListener('click', this.next.bind(this))
        prevButton.addEventListener('click', this.prev.bind(this))
        if (this.options.loop === true) {
            return
        }
        this.onMove(index => {
            if (index===0) {
                prevButton.classList.add('carousel__prev--hidden')
            } else {
                prevButton.classList.remove('carousel__prev--hidden')
            }
            if (index >= this.items.length || this.items[this.currentItem + this.slidesVisible] === undefined) {
                nextButton.classList.add('carousel__next--hidden')
            } else {
                nextButton.classList.remove('carousel__next--hidden')
            }
        })

    }

    /**
     * Crée la pagination dans le DOM
     */
    createPagination(){
        let pagination = this.createDivWIthClass('carousel__pagination')
        let buttons = []
        this.root.appendChild(pagination)
        for (let i = 0; i < this.items.length - (2 * this.offset); i = i + this.options.slidesToScroll) {
            let button = this.createDivWIthClass('carousel__pagination__button')
            button.addEventListener('click', () => this.gotoItem(i + this.offset))
            pagination.appendChild(button)
            buttons.push(button)
        }
        this.onMove(index => {
            let count = this.items.length - 2 * this.offset
            let activeButton = buttons[Math.floor(((index - this.offset) % count) / this.options.slidesToScroll)]
            if (activeButton) {
                buttons.forEach(button => button.classList.remove('carousel__pagination__button--active'))
                activeButton.classList.add('carousel__pagination__button--active')
            }
        })
    }

    translate(percent) {
        this.container.style.transform = 'translate3d(' + percent + '%, 0, 0)'
    }

    next(){
        this.gotoItem(this.currentItem + this.slidesToScroll)
    }

    prev() {
        this.gotoItem(this.currentItem - this.slidesToScroll)
    }

    /**
     * Déplace le carousel vers l'element ciblé
     * @param {number} index 
     * @param {boolean} [animation = true]
     */
    gotoItem(index, animation = true) {
        if (index < 0) {
            if (this.options.loop) {
                index = this.items.length - this.slidesVisible
            } else {
                return
            }
        } else if (index >= this.items.length || this.items[this.currentItem + this.slidesVisible] === undefined && index > this.currentItem) {
            if (this.options.loop) {
            index = 0
            } else {
                return
            }
        }
        let translateX = index * -100 / this.items.length
        if (animation === false) {
            this.disableTransition()
        }
        this.translate(translateX)
        this.container.offsetHeight // force repaint
        if (animation === false) {
            this.enableTransition()
        }
        this.currentItem = index
        this.moveCallbacks.forEach(cb => cb(index))

    }

    /**
     * Déplace le container pour donner une impression d'infini
     */
    resetInfinite() {
        if (this.currentItem <= this.options.slidesToScroll) {
            this.gotoItem(this.currentItem + (this.items.length - 2 * this.offset), false)
        } else if (this.currentItem >= this.items.length - this.offset) {
            this.gotoItem(this.currentItem - (this.items.length - 2 * this.offset), false)

        }

    }

    /**
     * 
     * @param {moveCallback} cb 
     */
    onMove (cb) {
        this.moveCallbacks.push(cb)
    }

    onWindowResize () {
        let mobile = window.innerWidth < 800
        if (mobile !== this.mobile) {
            this.isMobile = mobile
            this.setStyle()
            this.moveCallbacks.forEach(cb => cb(this.currentItem))
        }
    }

    /**
     * @param {string} classname 
     * @returns {HTMLElement}
     */
    createDivWIthClass(classname){
        let div = document.createElement('div')
        div.setAttribute('class', classname)
        return div
    }

    disableTransition() {
        this.container.style.transition = 'none'
    }

    enableTransition() {
        this.container.style.transition = ''
    }

    /**
     * @return {number}
     */
    get slidesToScroll () {
        return this.isMobile ? 1 : this.options.slidesToScroll
    }

    /**
     * @return {number}
     */
    get slidesVisible () {
        return this.isMobile ? 1 : this.options.slidesVisible
    }

    /**
     * @return {number}
     */
    get containerWidth() {
        this.container.offsetWidth
    }
}

document.addEventListener('DOMContentLoaded', function () {
    
    new Carousel(document.querySelector('#carousel1'), {
        slidesVisible: 3,
        slidesToScroll: 1,
        infinite: true,
        pagination: true
    }) 
})
document.addEventListener('DOMContentLoaded', function () {
    
    new Carousel(document.querySelector('#carousel2'), {
        slidesVisible: 2,
        slidesToScroll: 1,
        infinite: true,
        pagination: true
    }) 
})