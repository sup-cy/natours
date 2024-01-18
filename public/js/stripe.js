import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51OXHgdLO1MivDHmGWeqrhZxX814uL5WLVB4wQw3VbxBpNtuuIPpiT2XErwhsZ824kXSFa9WXQW172bJUPvEJpkwi00tdWUwGdF',
);

export const bookTour = async (tourId) => {
  try {
    // 1) get checkout session from serves
    const session = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/booking/checkout-session/${tourId}`,
    });
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    console.log(session);
  } catch (err) {
    showAlert('error', err.message);
  }
};
