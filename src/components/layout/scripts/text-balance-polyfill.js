// https://bleech.de/en/blog/the-ups-and-downs-of-text-wrap-balance-and-a-polyfill/

export default function () {
  if (!window.CSS.supports("text-wrap", "balance")) {
    const elements = document.querySelectorAll(".textWrapBalance, h1");
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        relayout(entry.target);
      });
    });
    elements.forEach((element) => {
      relayout(element);
      resizeObserver.observe(element);
    });
    window.addEventListener("resize", () => {
      elements.forEach((element) => {
        relayout(element);
      });
    });
  }
}

function relayout(wrapper, ratio = 1) {
  const container = wrapper.parentElement;

  const update = (width) => {
    wrapper.style.maxWidth = `${width}px`;
  };

  wrapper.style.display = "inline-block";
  wrapper.style.verticalAlign = "top";
  // Reset wrapper width
  wrapper.style.maxWidth = "";

  // Get the initial container size
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Synchronously do binary search and calculate the layout
  let lower = width / 2 - 0.25;
  let upper = width + 0.5;
  let middle;

  if (width) {
    // Ensure we don't search widths lower than when the text overflows
    update(lower);
    lower = Math.max(wrapper.scrollWidth, lower);

    while (lower + 1 < upper) {
      middle = Math.round((lower + upper) / 2);
      update(middle);
      if (container.clientHeight === height) {
        upper = middle;
      } else {
        lower = middle;
      }
    }

    update(upper * ratio + width * (1 - ratio));
  }
}
