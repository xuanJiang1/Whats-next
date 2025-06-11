// 数据模型
const ChaosPlannerApp = {
    tasks: [],
    settings: {
        defaultDrawTime: 30,
        preferredRandomization: 'uniform'
    },
    
    // 初始化应用
    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderTaskLists();
        this.updateCategoryFilters();
        this.setupTabs();
    },
    
    // 从localStorage加载数据
    loadData() {
        const savedTasks = localStorage.getItem('chaos_planner_tasks');
        const savedSettings = localStorage.getItem('chaos_planner_settings');
        
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }
        
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
        }
        
        // 检查并重置今日已完成的常规任务状态
        this.resetCompletedRepeatingTasks();
    },
    
    // 保存数据到localStorage
    saveData() {
        localStorage.setItem('chaos_planner_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('chaos_planner_settings', JSON.stringify(this.settings));
    },
    
    // 设置标签页切换
    setupTabs() {
        const tabBtns = document.querySelectorAll('.main-tab-btn');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // 移除所有活跃状态
                document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
                
                // 设置当前标签为活跃
                btn.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    },
    
    // 设置事件监听器
    setupEventListeners() {
        // 操作按钮
        document.getElementById('add-task-fab').addEventListener('click', () => {
            this.openModal('add-task-modal');
        });
        
        document.getElementById('draw-task-fab').addEventListener('click', () => {
            this.openModal('draw-settings-modal');
        });
        
        // 时间选择按钮
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.getAttribute('data-minutes'));
                this.setSelectedTime(minutes);
            });
        });
        
        // 自定义时间设置
        document.getElementById('set-custom-time').addEventListener('click', () => {
            const customTime = document.getElementById('custom-time').value;
            if (customTime && !isNaN(customTime) && customTime > 0) {
                this.setSelectedTime(parseInt(customTime));
            } else {
                this.showNotification('请输入有效的时间', 'error');
            }
        });
        
        // 抽取任务按钮
        document.getElementById('draw-btn').addEventListener('click', () => {
            this.closeModal('draw-settings-modal');
            this.drawTask();
        });
        
        // 添加任务表单提交
        document.getElementById('add-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewTask();
        });
        
        // 取消添加按钮
        document.getElementById('cancel-add').addEventListener('click', () => {
            this.closeModal('add-task-modal');
        });
        
        // 编辑任务表单提交
        document.getElementById('edit-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedTask();
        });
        
        // 取消编辑按钮
        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.closeModal('task-edit-modal');
        });
        
        // 关闭模态框按钮
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });
    },
    
    // 设置选中的时间
    setSelectedTime(minutes) {
        this.settings.defaultDrawTime = minutes;
        document.getElementById('current-time-slot').textContent = `${minutes}分钟`;
        
        // 更新时间按钮的活跃状态
        document.querySelectorAll('.time-btn').forEach(btn => {
            const btnMinutes = parseInt(btn.getAttribute('data-minutes'));
            if (btnMinutes === minutes) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.saveData();
    },
    
    // 添加新任务
    addNewTask() {
        const taskName = document.getElementById('new-task-name').value.trim();
        
        if (!taskName) {
            this.showNotification('请输入任务名称', 'error');
            return;
        }
        
        // 检查必填字段是否已选择
        const repeatable = document.querySelector('input[name="new-repeatable"]:checked');
        const priority = document.querySelector('input[name="new-priority"]:checked');
        const energy = document.querySelector('input[name="new-energy"]:checked');
        const duration = document.getElementById('new-duration').value;
        
        if (!repeatable || !priority || !energy || !duration) {
            this.showNotification('请填写所有必填字段', 'error');
            return;
        }
        
        const newTask = {
            id: Date.now().toString(),
            name: taskName,
            isRepeatable: repeatable.value === 'true',
            duration: parseInt(duration),
            priority: priority.value,
            energy: energy.value,
            category: document.getElementById('new-category').value.trim(),
            isArchived: false,
            lastCompletedDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.tasks.push(newTask);
        this.saveData();
        this.renderTaskLists();
        this.updateCategoryFilters();
        
        this.closeModal('add-task-modal');
        this.showNotification('任务已添加');
    },
    
    // 编辑任务
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-name').value = task.name;
        document.getElementById('edit-duration').value = task.duration;
        document.getElementById('edit-category').value = task.category || '';
        
        // 设置单选按钮
        document.querySelector(`input[name="edit-repeatable"][value="${task.isRepeatable}"]`).checked = true;
        document.querySelector(`input[name="edit-priority"][value="${task.priority}"]`).checked = true;
        document.querySelector(`input[name="edit-energy"][value="${task.energy}"]`).checked = true;
        
        this.openModal('task-edit-modal');
    },
    
    // 保存编辑后的任务
    saveEditedTask() {
        const taskId = document.getElementById('edit-task-id').value;
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        
        task.name = document.getElementById('edit-task-name').value.trim();
        task.duration = parseInt(document.getElementById('edit-duration').value);
        task.isRepeatable = document.querySelector('input[name="edit-repeatable"]:checked').value === 'true';
        task.priority = document.querySelector('input[name="edit-priority"]:checked').value;
        task.energy = document.querySelector('input[name="edit-energy"]:checked').value;
        task.category = document.getElementById('edit-category').value.trim();
        task.updatedAt = new Date().toISOString();
        
        this.saveData();
        this.renderTaskLists();
        this.updateCategoryFilters();
        this.closeModal('task-edit-modal');
        this.showNotification('任务已更新');
    },
    
    // 删除任务
    deleteTask(taskId) {
        if (!confirm('确定要删除这个任务吗？')) return;
        
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        this.tasks.splice(taskIndex, 1);
        this.saveData();
        this.renderTaskLists();
        this.updateCategoryFilters();
        this.showNotification('任务已删除');
    },    // 标记任务完成
    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // 如果是在任务卡片模态框中完成
        if (document.getElementById('task-card-modal').style.display === 'block') {
            // 创建庆祝动画
            this.createConfetti();
            
            // 等待动画完成后再更新数据和UI
            setTimeout(() => {
                task.lastCompletedDate = new Date().toISOString().split('T')[0]; // 仅保存日期部分
                this.saveData();
                this.renderTaskLists();
                this.closeModal('task-card-modal');
                this.showNotification('任务已完成');
            }, 1500); // 动画时长
        } else {
            // 如果是从任务列表中完成，直接更新数据
            task.lastCompletedDate = new Date().toISOString().split('T')[0];
            this.saveData();
            this.renderTaskLists();
            this.showNotification('任务已完成');
        }
    },
    
    // 撤销完成
    undoComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.lastCompletedDate = null;
        task.isArchived = false;
        
        this.saveData();
        this.renderTaskLists();
        this.showNotification('已撤销完成状态');
    },
    
    // 重置今日已完成的常规任务状态
    resetCompletedRepeatingTasks() {
        const today = new Date().toISOString().split('T')[0];
        
        this.tasks.forEach(task => {
            if (task.isRepeatable && task.lastCompletedDate && task.lastCompletedDate < today) {
                task.lastCompletedDate = null;
            }
        });
        
        this.saveData();
    },
    
    // 渲染任务列表
    renderTaskLists() {
        this.renderActiveTasks();
        this.renderArchivedTasks();
    },
    
    // 渲染活跃任务列表
    renderActiveTasks() {
        const activeTasksContainer = document.getElementById('active-tasks');
        // 只显示未完成的任务
        const activeTasks = this.tasks.filter(task => 
            !task.isArchived && !task.lastCompletedDate);
        
        if (activeTasks.length === 0) {
            activeTasksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>任务池是空的，添加一些任务吧！</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        activeTasks.forEach(task => {
            html += `
                <div class="task-item">
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-meta">
                            <span><i class="far fa-clock"></i> ${task.duration}分钟</span>
                            <span><i class="fas fa-redo-alt"></i> ${task.isRepeatable ? '常规' : '一次性'}</span>
                            <span><i class="fas fa-tag"></i> ${this.getPriorityLabel(task.priority)}</span>
                            <span><i class="fas fa-bolt"></i> ${this.getEnergyLabel(task.energy)}</span>
                            ${task.category ? `<span><i class="fas fa-folder"></i> ${task.category}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions-btns">
                        <button class="action-btn edit-btn" onclick="ChaosPlannerApp.editTask('${task.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="ChaosPlannerApp.deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn complete-btn" onclick="ChaosPlannerApp.completeTask('${task.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        activeTasksContainer.innerHTML = html;
    },
    
    // 渲染已归档任务列表
    renderArchivedTasks() {
        const archivedTasksContainer = document.getElementById('archived-tasks');
        // 显示已归档任务和所有已完成的任务
        const archivedTasks = this.tasks.filter(task => 
            task.isArchived || task.lastCompletedDate
        );
        
        if (archivedTasks.length === 0) {
            archivedTasksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-archive"></i>
                    <p>没有已完成的任务</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        archivedTasks.forEach(task => {
            const isCompletedToday = task.lastCompletedDate === new Date().toISOString().split('T')[0];
            
            html += `
                <div class="task-item completed-task">
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-meta">
                            <span><i class="far fa-clock"></i> ${task.duration}分钟</span>
                            <span><i class="fas fa-redo-alt"></i> ${task.isRepeatable ? '常规' : '一次性'}</span>
                            <span><i class="fas fa-tag"></i> ${this.getPriorityLabel(task.priority)}</span>
                            <span><i class="fas fa-bolt"></i> ${this.getEnergyLabel(task.energy)}</span>
                            ${task.category ? `<span><i class="fas fa-folder"></i> ${task.category}</span>` : ''}
                            ${isCompletedToday ? '<span><i class="fas fa-check-circle"></i> 今日已完成</span>' : 
                              `<span><i class="fas fa-calendar-check"></i> 完成于 ${task.lastCompletedDate}</span>`}
                        </div>
                    </div>
                    <div class="task-actions-btns">
                        <button class="action-btn delete-btn" onclick="ChaosPlannerApp.deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn undo-btn" onclick="ChaosPlannerApp.undoComplete('${task.id}')">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        archivedTasksContainer.innerHTML = html;
    },    // 更新分类筛选选项
    updateCategoryFilters() {
        const categoryFilters = document.getElementById('category-filters');
        const categoryList = document.getElementById('category-list');
        
        // 获取所有不重复的分类
        const categories = [...new Set(this.tasks.map(task => task.category).filter(Boolean))];
        
        // 更新分类筛选选项
        let filtersHtml = '';
        if (categories.length === 0) {
            filtersHtml = '<p>暂无分类</p>';
        } else {
            categories.forEach(category => {
                filtersHtml += `
                    <label>
                        <input type="checkbox" name="category" value="${category}" checked> ${category}
                    </label>
                `;
            });
        }
        categoryFilters.innerHTML = filtersHtml;
        
        // 更新分类下拉列表
        let optionsHtml = '';
        categories.forEach(category => {
            optionsHtml += `<option value="${category}">${category}</option>`;
        });
        categoryList.innerHTML = optionsHtml;
    },
    
    // 抽取任务
    drawTask() {
        // 获取筛选条件
        const availableTime = this.settings.defaultDrawTime;
        const selectedPriorities = [...document.querySelectorAll('input[name="priority"]:checked')].map(el => el.value);
        const selectedEnergies = [...document.querySelectorAll('input[name="energy"]:checked')].map(el => el.value);
        const selectedCategories = [...document.querySelectorAll('input[name="category"]:checked')].map(el => el.value);
        const includeCompletedRepeatable = document.getElementById('include-completed-repeatable').checked;
        
        // 筛选任务
        let eligibleTasks = this.tasks.filter(task => {
            // 基本条件：未归档且时长符合
            const basicCondition = !task.isArchived && task.duration <= availableTime;
            
            // 优先级筛选
            const priorityMatch = selectedPriorities.length === 0 || selectedPriorities.includes(task.priority);
            
            // 能量等级筛选
            const energyMatch = selectedEnergies.length === 0 || selectedEnergies.includes(task.energy);
            
            // 分类筛选
            const categoryMatch = selectedCategories.length === 0 || 
                                 (task.category && selectedCategories.includes(task.category)) ||
                                 (!task.category && selectedCategories.includes(''));
            
            // 今日已完成的常规任务筛选
            const completedTodayCondition = !(task.isRepeatable && 
                                            task.lastCompletedDate === new Date().toISOString().split('T')[0] && 
                                            !includeCompletedRepeatable);
            
            return basicCondition && priorityMatch && energyMatch && categoryMatch && completedTodayCondition;
        });
        
        if (eligibleTasks.length === 0) {
            this.showNotification('没有符合条件的任务', 'error');
            return;
        }
        
        // 随机抽取
        let selectedTask;
        if (this.settings.preferredRandomization === 'weighted') {
            // 加权随机：优先级高的任务有更高概率被选中
            const weights = {
                'high': 3,
                'medium': 2,
                'low': 1
            };
            
            const totalWeight = eligibleTasks.reduce((sum, task) => sum + weights[task.priority], 0);
            let random = Math.random() * totalWeight;
            
            for (const task of eligibleTasks) {
                random -= weights[task.priority];
                if (random <= 0) {
                    selectedTask = task;
                    break;
                }
            }
            
            // 防止未选中（理论上不会发生）
            if (!selectedTask) {
                selectedTask = eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)];
            }
        } else {
            // 均匀随机
            selectedTask = eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)];
        }
        
        // 打开任务卡片模态框并执行卡片抽取动画
        this.openModal('task-card-modal');
        this.animateCardDraw(selectedTask);
    },
    
    // 卡片抽取动画
    animateCardDraw(selectedTask) {
        const cardContainer = document.getElementById('task-card-container');
        
        // 清空现有内容
        cardContainer.innerHTML = '';
        
        // 创建卡片轮播容器
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'card-carousel';
        cardContainer.appendChild(carouselContainer);
        
        // 获取所有任务项的位置信息
        const taskItems = document.querySelectorAll('.task-item');
        if (taskItems.length === 0) {
            // 如果没有任务项，回退到原来的动画
            this.fallbackCardAnimation(selectedTask, carouselContainer);
            return;
        }
        
        // 创建从任务项飞出的小卡片
        const miniCards = [];
        const miniCardCount = Math.min(taskItems.length, 8); // 最多8张小卡片
        
        for (let i = 0; i < miniCardCount; i++) {
            const taskItem = taskItems[i];
            const rect = taskItem.getBoundingClientRect();
            const containerRect = carouselContainer.getBoundingClientRect();
            
            // 计算相对位置
            const startX = rect.left - containerRect.left + (rect.width / 2) - 160; // 160是小卡片宽度的一半
            const startY = rect.top - containerRect.top + (rect.height / 2) - 110; // 110是小卡片高度的一半
            
            // 创建小卡片
            const miniCard = document.createElement('div');
            miniCard.className = 'mini-card';
            miniCard.style.setProperty('--start-x', `${startX}px`);
            miniCard.style.setProperty('--start-y', `${startY}px`);
            
            // 添加小卡片内容（简化版的任务项）
            miniCard.innerHTML = `
                <div class="mini-card-content">
                    <div class="mini-card-title">${taskItem.querySelector('.task-name').textContent.substring(0, 10)}${taskItem.querySelector('.task-name').textContent.length > 10 ? '...' : ''}</div>
                </div>
                <div class="mini-card-back"></div>
            `;
            
            carouselContainer.appendChild(miniCard);
            miniCards.push(miniCard);
        }
        
        // 依次动画小卡片飞到中心并翻转
        let delay = 0;
        miniCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.animation = `miniCardToCenter 0.8s forwards`;
            }, delay);
            delay += 150;
        });
        
        // 所有卡片到达中心后，创建最终卡片并执行洗牌动画
        setTimeout(() => {
            // 移除所有小卡片
            miniCards.forEach(card => {
                card.remove();
            });
            
            // 创建最终卡片（背面）
            const finalCardBack = document.createElement('div');
            finalCardBack.className = 'card-back';
            finalCardBack.style.transform = 'scale(0.5) rotateY(180deg)';
            carouselContainer.appendChild(finalCardBack);
            
            // 洗牌动画
            finalCardBack.style.animation = 'shuffleCards 0.8s ease-in-out';
            
            // 洗牌后放大
            setTimeout(() => {
                finalCardBack.style.animation = 'cardGrow 0.6s forwards';
                
                // 放大后翻转显示任务卡
                setTimeout(() => {
                    this.showFinalCard(selectedTask, carouselContainer);
                }, 600);
            }, 800);
        }, delay + 300);
    },
    
    // 回退到原来的卡片动画（当没有任务项时使用）
    fallbackCardAnimation(selectedTask, carouselContainer) {
        // 创建5-7张卡背
        const cardCount = 5 + Math.floor(Math.random() * 3); // 5-7张卡片
        const cardBacks = [];
        
        for (let i = 0; i < cardCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            cardBack.style.display = 'none';
            carouselContainer.appendChild(cardBack);
            cardBacks.push(cardBack);
        }
        
        // 开始轮播动画
        let currentCardIndex = 0;
        const showNextCard = () => {
            // 隐藏所有卡片
            cardBacks.forEach(card => card.style.display = 'none');
            
            if (currentCardIndex < cardCount) {
                // 显示当前卡片
                const currentCard = cardBacks[currentCardIndex];
                currentCard.style.display = 'flex';
                
                // 设置动画
                const duration = 150 - (currentCardIndex * 15); // 逐渐减慢
                currentCard.style.animation = `cardCarousel ${duration}ms ease-out forwards`;
                
                // 显示下一张卡片
                currentCardIndex++;
                setTimeout(showNextCard, duration);
            } else {
                // 轮播结束，显示最终卡片
                this.showFinalCard(selectedTask, carouselContainer);
            }
        };
        
        // 开始轮播
        showNextCard();
    },
    
    // 显示最终选中的卡片
    showFinalCard(task, container) {
        // 调整容器高度为自适应
        container.style.height = 'auto';
        
        // 如果已经有卡片背面，使用它，否则创建一个新的
        let finalCardBack = container.querySelector('.card-back');
        if (!finalCardBack) {
            finalCardBack = document.createElement('div');
            finalCardBack.className = 'card-back';
            container.appendChild(finalCardBack);
        }
        
        // 创建任务卡（正面）
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.style.transform = 'rotateY(180deg)'; // 初始状态为背面
        taskCard.innerHTML = this.getTaskCardHTML(task);
        
        // 添加关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-modal';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '15px';
        closeBtn.style.right = '20px';
        closeBtn.addEventListener('click', () => this.closeModal('task-card-modal'));
        taskCard.appendChild(closeBtn);
        
        container.appendChild(taskCard);
        
        // 翻转卡片
        setTimeout(() => {
            finalCardBack.style.transform = 'rotateY(180deg)';
            taskCard.style.animation = 'cardFlip 0.6s forwards';
            
            // 播放音效
            setTimeout(() => {
                this.playCardSound();
            }, 600);
        }, 300);
    },    // 播放卡片音效
    playCardSound() {
        const sound = document.getElementById('card-sound');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('无法播放音效:', e));
        }
    },
    
    // 创建庆祝动画
    createConfetti() {
        const confettiContainer = document.getElementById('confetti-container');
        confettiContainer.innerHTML = '';
        
        // 创建50个彩色纸屑
        const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // 随机位置、颜色和大小
            const size = Math.random() * 10 + 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const animationDuration = Math.random() * 2 + 1;
            const animationDelay = Math.random() * 0.5;
            
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.backgroundColor = color;
            confetti.style.left = `${left}%`;
            confetti.style.animation = `confetti-fall ${animationDuration}s ease-in ${animationDelay}s forwards`;
            
            confettiContainer.appendChild(confetti);
        }
        
        // 清理动画
        setTimeout(() => {
            confettiContainer.innerHTML = '';
        }, 3000);
    },
    
    // 获取任务卡HTML
    getTaskCardHTML(task) {
        return `
            <h3>${task.name}</h3>
            <div class="task-attributes">
                <div class="attribute">
                    <i class="far fa-clock"></i>
                    <span>预计时长: ${task.duration}分钟</span>
                </div>
                <div class="attribute">
                    <i class="fas fa-redo-alt"></i>
                    <span>类型: ${task.isRepeatable ? '常规任务' : '一次性任务'}</span>
                </div>
                <div class="attribute">
                    <i class="fas fa-tag"></i>
                    <span>优先级: ${this.getPriorityLabel(task.priority)}</span>
                </div>
                <div class="attribute">
                    <i class="fas fa-bolt"></i>
                    <span>能量等级: ${this.getEnergyLabel(task.energy)}</span>
                </div>
                ${task.category ? `
                    <div class="attribute">
                        <i class="fas fa-folder"></i>
                        <span>分类: ${task.category}</span>
                    </div>
                ` : ''}
            </div>
            <div class="task-actions">
                <button class="secondary-btn" onclick="ChaosPlannerApp.drawTask()">
                    <i class="fas fa-sync-alt"></i> 换一个
                </button>
                <button class="secondary-btn" onclick="ChaosPlannerApp.openTimer(${task.duration})">
                    <i class="fas fa-stopwatch"></i> 开始计时
                </button>
                <button class="primary-btn" onclick="ChaosPlannerApp.completeTask('${task.id}')">
                    <i class="fas fa-check"></i> 标记完成
                </button>
            </div>
        `;
    },
    
    // 打开模态框
    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        
        // 如果是添加任务模态框，重置表单
        if (modalId === 'add-task-modal') {
            // 清空所有输入字段
            document.getElementById('new-task-name').value = '';
            document.getElementById('new-duration').value = '';
            document.getElementById('new-category').value = '';
            
            // 清除所有单选按钮的选中状态
            document.querySelectorAll('input[name="new-repeatable"]').forEach(radio => radio.checked = false);
            document.querySelectorAll('input[name="new-priority"]').forEach(radio => radio.checked = false);
            document.querySelectorAll('input[name="new-energy"]').forEach(radio => radio.checked = false);
        }
    },
    
    // 关闭模态框
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        
        // 如果是任务卡片模态框，同时清空计时器容器
        if (modalId === 'task-card-modal') {
            const timerContainer = document.getElementById('timer-container');
            timerContainer.classList.remove('active');
            timerContainer.innerHTML = '';
        }
    },
    
    // 显示通知
    showNotification(message, type = 'success') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动关闭
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    },
    
    // 打开计时器
    openTimer(duration) {
        // 设置计时器初始时间
        this.timerDuration = duration * 60; // 转换为秒
        this.timerRemaining = this.timerDuration;
        this.timerRunning = false;
        
        // 创建计时器UI
        const timerContainer = document.getElementById('timer-container');
        timerContainer.innerHTML = `
            <div class="timer-display">
                <span id="timer-minutes">00</span>:<span id="timer-seconds">00</span>
            </div>
            <div class="timer-controls">
                <button id="timer-start" class="primary-btn">开始</button>
                <button id="timer-pause" class="secondary-btn" disabled>暂停</button>
                <button id="timer-reset" class="secondary-btn">重置</button>
            </div>
        `;
        
        // 显示计时器
        timerContainer.classList.add('active');
        
        // 更新计时器显示
        this.updateTimerDisplay();
        
        // 添加计时器按钮事件
        document.getElementById('timer-start').addEventListener('click', () => this.startTimer());
        document.getElementById('timer-pause').addEventListener('click', () => this.pauseTimer());
        document.getElementById('timer-reset').addEventListener('click', () => this.resetTimer());
    },
    
    // 开始计时器
    startTimer() {
        if (this.timerRunning) return;
        
        this.timerRunning = true;
        document.getElementById('timer-start').disabled = true;
        document.getElementById('timer-pause').disabled = false;
        
        this.timerInterval = setInterval(() => {
            this.timerRemaining--;
            this.updateTimerDisplay();
            
            if (this.timerRemaining <= 0) {
                this.stopTimer();
                this.showNotification('计时结束！');
            }
        }, 1000);
    },
    
    // 暂停计时器
    pauseTimer() {
        if (!this.timerRunning) return;
        
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('timer-start').disabled = false;
        document.getElementById('timer-pause').disabled = true;
    },
    
    // 停止计时器
    stopTimer() {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('timer-start').disabled = false;
        document.getElementById('timer-pause').disabled = true;
    },
    
    // 重置计时器
    resetTimer() {
        this.stopTimer();
        this.timerRemaining = this.timerDuration;
        this.updateTimerDisplay();
    },
    
    // 更新计时器显示
    updateTimerDisplay() {
        const minutes = Math.floor(this.timerRemaining / 60);
        const seconds = this.timerRemaining % 60;
        
        document.getElementById('timer-minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('timer-seconds').textContent = seconds.toString().padStart(2, '0');
    },
    
    // 获取优先级标签
    getPriorityLabel(priority) {
        const labels = {
            'high': '高优先级',
            'medium': '中优先级',
            'low': '低优先级'
        };
        return labels[priority] || priority;
    },
    
    // 获取能量等级标签
    getEnergyLabel(energy) {
        const labels = {
            'high': '高能量',
            'medium': '中能量',
            'low': '低能量'
        };
        return labels[energy] || energy;
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    ChaosPlannerApp.init();
});