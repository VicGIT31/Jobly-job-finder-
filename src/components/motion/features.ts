// Chargé à la demande par <LazyMotion> : garde le moteur d'animation hors du
// bundle critique. `domMax` inclut les animations de layout (`layoutId`).
import { domMax } from "motion/react";

export default domMax;
