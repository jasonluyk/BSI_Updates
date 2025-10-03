// Rating buttons functionality
        const ratingBtns = document.querySelectorAll('.rating-btn');
        const ratingInput = document.getElementById('rating');
        
        ratingBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                ratingBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                ratingInput.value = this.getAttribute('data-rating');
            });
        });

        // Form submission
        const feedbackForm = document.getElementById('feedbackForm');
        const alertContainer = document.getElementById('alertContainer');
        
        function showAlert(message, type) {
            alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }
        
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            
            const formData = {
                name: document.getElementById('name').value || 'Anonymous',
                email: document.getElementById('email').value || '',
                company: document.getElementById('company').value || '',
                message: document.getElementById('message').value,
                rating: document.getElementById('rating').value ? Number(document.getElementById('rating').value) : null
            };
            
            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    showAlert('Thank you for your feedback! 🎉', 'success');
                    feedbackForm.reset();
                    ratingBtns.forEach(b => b.classList.remove('active'));
                    
                    // Scroll to top to show success message
                    window.scrollTo({ top: document.querySelector('.feedback-section').offsetTop - 100, behavior: 'smooth' });
                } else {
                    const data = await response.json();
                    showAlert(data.error || 'Failed to submit feedback. Please try again.', 'error');
                }
            } catch (error) {
                console.error('❌ Error submitting feedback:', error);
                showAlert('Failed to submit feedback. Please check your connection and try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Feedback';
            }
        });