// Imitacion del modulo 'timer' de Moddable para correr las pruebas en Node.
const Timer = {
  set: (fn, ms) => setTimeout(fn, ms),
  repeat: (fn, ms) => setInterval(fn, ms),
  clear: (id) => clearTimeout(id),
};
export default Timer;
